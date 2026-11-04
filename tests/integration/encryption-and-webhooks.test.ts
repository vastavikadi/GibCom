import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  isEncrypted,
  encryptConfigSecrets,
  decryptConfigSecrets,
} from '@/lib/security/encryption';
import { POST as githubWebhook } from '@/app/api/webhooks/github/route';
import { POST as slackWebhook } from '@/app/api/webhooks/slack/route';
import { POST as syncAllConnectors } from '@/app/api/connectors/sync-all/route';
import crypto from 'crypto';

describe('Secret Encryption at Rest & Real-Time Webhooks (Integration)', () => {
  describe('AES-256-GCM Encryption', () => {
    it('encrypts and decrypts secret tokens cleanly with unique IVs', () => {
      const original = 'ghp_secretTokenWithSpecialSymbols123!@#$';

      const cipher1 = encryptSecret(original);
      const cipher2 = encryptSecret(original);

      // Should be prefixed and identifiable
      expect(isEncrypted(cipher1)).toBe(true);
      expect(isEncrypted(cipher2)).toBe(true);

      // Unique IV ensures identical plaintext produces different ciphertexts
      expect(cipher1).not.toBe(cipher2);

      // Both must decrypt cleanly back to original plaintext
      expect(decryptSecret(cipher1)).toBe(original);
      expect(decryptSecret(cipher2)).toBe(original);
    });

    it('handles plaintext backwards-compatibility and idempotency', () => {
      const plaintext = 'xoxb-plain-unencrypted-legacy-token';

      // Calling decrypt on an unencrypted string returns the plaintext as-is
      expect(decryptSecret(plaintext)).toBe(plaintext);

      // Encrypting an already encrypted string is idempotent
      const encrypted = encryptSecret(plaintext);
      const reEncrypted = encryptSecret(encrypted);
      expect(reEncrypted).toBe(encrypted);
      expect(decryptSecret(reEncrypted)).toBe(plaintext);
    });

    it('encrypts and decrypts objects with multiple secret keys', () => {
      const config = {
        token: 'ghp_test123',
        repo: 'facebook/react',
        botToken: 'xoxb-test456',
        channel: 'general',
      };

      const encryptedConfig = encryptConfigSecrets(config);
      expect(isEncrypted(encryptedConfig.token)).toBe(true);
      expect(isEncrypted(encryptedConfig.botToken)).toBe(true);
      expect(encryptedConfig.repo).toBe('facebook/react');
      expect(encryptedConfig.channel).toBe('general');

      const decryptedConfig = decryptConfigSecrets(encryptedConfig);
      expect(decryptedConfig.token).toBe('ghp_test123');
      expect(decryptedConfig.botToken).toBe('xoxb-test456');
    });
  });

  describe('Real-Time Webhooks', () => {
    it('processes GitHub ping and pull_request webhook events', async () => {
      // 1. Ping event
      const pingReq = new NextRequestMock('http://localhost:3000/api/webhooks/github', {
        headers: {
          'x-github-event': 'ping',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ zen: 'Keep it logically awesome.' }),
      });

      const pingRes = await githubWebhook(pingReq as any);
      const pingBody = await pingRes.json();
      expect(pingRes.status).toBe(200);
      expect(pingBody.success).toBe(true);

      // 2. Pull Request closed / merged event
      const prPayload = {
        action: 'closed',
        repository: { full_name: 'facebook/react' },
        pull_request: {
          number: 199,
          title: 'Implement streaming transactional log compaction',
          state: 'closed',
          merged: true,
          html_url: 'https://github.com/facebook/react/pull/199',
          user: { login: 'octocat' },
          head: { ref: 'feature/log-compaction' },
          base: { ref: 'main' },
          body: 'Replaces in-memory buffer with bounded disk queue to prevent out-of-memory spikes under peak load.',
        },
      };

      const prReq = new NextRequestMock('http://localhost:3000/api/webhooks/github', {
        headers: {
          'x-github-event': 'pull_request',
          'content-type': 'application/json',
        },
        body: JSON.stringify(prPayload),
      });

      const prRes = await githubWebhook(prReq as any);
      const prBody = await prRes.json();
      expect(prRes.status).toBe(200);
      expect(prBody.success).toBe(true);
      expect(prBody.data.sourceId).toBeDefined();
      expect(prBody.data.chunksCount).toBeGreaterThanOrEqual(1);
    });

    it('handles Slack URL verification handshake and message events', async () => {
      // 1. URL verification challenge
      const challengeReq = new NextRequestMock('http://localhost:3000/api/webhooks/slack', {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'url_verification',
          challenge: 'test-challenge-token-slack-12345',
        }),
      });

      const challengeRes = await slackWebhook(challengeReq as any);
      const challengeBody = await challengeRes.json();
      expect(challengeRes.status).toBe(200);
      expect(challengeBody.challenge).toBe('test-challenge-token-slack-12345');

      // 2. Message event
      const messageReq = new NextRequestMock('http://localhost:3000/api/webhooks/slack', {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'event_callback',
          team_id: 'T0123456789',
          event: {
            type: 'message',
            channel: 'C0987654321',
            user: 'U1111111111',
            text: 'Decision: We have decided to migrate our caching layer from Redis standalone to Redis Sentinel to guarantee 99.99% uptime during failover.',
            ts: '1700000000.000100',
          },
        }),
      });

      const messageRes = await slackWebhook(messageReq as any);
      const messageBody = await messageRes.json();
      expect(messageRes.status).toBe(200);
      expect(messageBody.ok).toBe(true);
      expect(messageBody.sourceId).toBeDefined();
    });
  });

  describe('Background Sync Runner', () => {
    it('authenticates and executes scheduled sync-all runner', async () => {
      const syncReq = new NextRequestMock('http://localhost:3000/api/connectors/sync-all', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });

      const syncRes = await syncAllConnectors(syncReq as any);
      const syncBody = await syncRes.json();

      expect(syncRes.status).toBe(200);
      expect(syncBody.success).toBe(true);
      expect(syncBody.data).toBeDefined();
      expect(Array.isArray(syncBody.data.results)).toBe(true);
    });
  });
});

class NextRequestMock {
  private url: string;
  private headersMap: Map<string, string>;
  private bodyText: string;

  constructor(url: string, init?: { headers?: Record<string, string>; body?: string; method?: string }) {
    this.url = url;
    this.headersMap = new Map();
    if (init?.headers) {
      for (const [k, v] of Object.entries(init.headers)) {
        this.headersMap.set(k.toLowerCase(), v);
      }
    }
    this.bodyText = init?.body || '{}';
  }

  get headers() {
    return {
      get: (name: string) => this.headersMap.get(name.toLowerCase()) || null,
    };
  }

  async text() {
    return this.bodyText;
  }

  async json() {
    return JSON.parse(this.bodyText);
  }
}

