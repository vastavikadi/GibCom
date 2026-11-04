import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { GET as getConnectors, POST as saveConnector } from '@/app/api/connectors/route';
import { POST as testConnector } from '@/app/api/connectors/test/route';
import { POST as syncConnector } from '@/app/api/connectors/sync/route';
import { decryptSecret, isEncrypted } from '@/lib/security/encryption';

const ORG_ID = '11111111-1111-1111-1111-111111111111';

describe('Production Third-Party Connectors (Integration)', () => {
  it('saves and securely strips plaintext secrets while exposing isConfigured and maskedPreview', async () => {
    // 1. Save Slack configuration
    const saveSlackReq = new Request('http://localhost:3000/api/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'slack',
        config: {
          botToken: 'xoxb-1234567890-9876543210-abcdef123456',
          channelName: 'architecture-decisions',
          channelId: 'C0123456789',
        },
      }),
    });

    const saveSlackRes = await saveConnector(saveSlackReq as any);
    const saveSlackData = await saveSlackRes.json();
    expect(saveSlackData.success).toBe(true);

    // 2. Save GitHub configuration
    const saveGhReq = new Request('http://localhost:3000/api/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'github',
        config: {
          token: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
          repo: 'facebook/react',
          mode: 'pulls',
        },
      }),
    });

    const saveGhRes = await saveConnector(saveGhReq as any);
    const saveGhData = await saveGhRes.json();
    expect(saveGhData.success).toBe(true);

    // 3. Save Confluence configuration
    const saveConfReq = new Request('http://localhost:3000/api/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'confluence',
        config: {
          domain: 'acme.atlassian.net',
          email: 'admin@acme.com',
          apiToken: 'ATATT3xFfGF0123456789abcdef',
          spaceKey: 'ENG',
        },
      }),
    });

    const saveConfRes = await saveConnector(saveConfReq as any);
    const saveConfData = await saveConfRes.json();
    expect(saveConfData.success).toBe(true);

    // 4. Save Google Drive configuration
    const saveGdriveReq = new Request('http://localhost:3000/api/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'google_drive',
        config: {
          apiKeyOrToken: 'ya29.a0ARrdaM_example_oauth_token_for_gdrive',
          folderId: 'root',
        },
      }),
    });

    const saveGdriveRes = await saveConnector(saveGdriveReq as any);
    const saveGdriveData = await saveGdriveRes.json();
    expect(saveGdriveData.success).toBe(true);

    // 5. GET /api/connectors: Ensure tokens are stripped from output so inputs never get bullet strings
    const listRes = await getConnectors();
    const listData = await listRes.json();

    expect(listData.success).toBe(true);
    expect(listData.data.slack).toBeDefined();
    expect(listData.data.slack.botToken).toBeUndefined();
    expect(listData.data.slack.isConfigured).toBe(true);
    expect(listData.data.slack.maskedPreview).toContain('••••');
    expect(listData.data.slack.channelName).toBe('architecture-decisions');

    expect(listData.data.github).toBeDefined();
    expect(listData.data.github.token).toBeUndefined();
    expect(listData.data.github.isConfigured).toBe(true);
    expect(listData.data.github.maskedPreview).toContain('••••');
    expect(listData.data.github.repo).toBe('facebook/react');

    expect(listData.data.confluence).toBeDefined();
    expect(listData.data.confluence.apiToken).toBeUndefined();
    expect(listData.data.confluence.isConfigured).toBe(true);
    expect(listData.data.confluence.domain).toBe('acme.atlassian.net');

    expect(listData.data.google_drive).toBeDefined();
    expect(listData.data.google_drive.apiKeyOrToken).toBeUndefined();
    expect(listData.data.google_drive.isConfigured).toBe(true);
  });

  it('preserves saved credentials when updating non-secret fields or when sending empty/placeholder secret', async () => {
    // Update only the repo name without resending the token
    const updateGhReq = new Request('http://localhost:3000/api/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'github',
        config: {
          token: '', // empty: should preserve existing token
          repo: 'facebook/flow',
        },
      }),
    });

    const updateRes = await saveConnector(updateGhReq as any);
    const updateData = await updateRes.json();
    expect(updateData.success).toBe(true);

    // Verify stored org settings still have the original token
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, ORG_ID),
    });
    const settings = org?.settings as any;
    expect(isEncrypted(settings.connectors.github.token)).toBe(true);
    expect(decryptSecret(settings.connectors.github.token)).toBe('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');
    expect(settings.connectors.github.repo).toBe('facebook/flow');
  });

  it('prevents ByteString errors by safely rejecting non-ASCII characters in credentials', async () => {
    // Send a string containing bullet characters (\u2022) as token
    const testReq = new Request('http://localhost:3000/api/connectors/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'github',
        config: {
          token: 'ghp_••••••••••••••••••••••••••••••••••••',
          repo: 'facebook/react',
        },
      }),
    });

    // Should resolve token from database fallback or reject gracefully WITHOUT throwing ByteString TypeError
    const testRes = await testConnector(testReq as any);
    const testData = await testRes.json();
    expect(testRes.status).toBeLessThan(500);
    expect(testData.error).toBeDefined();
    expect(testData.error).not.toContain('ByteString');
  });

  it('tests live credentials against Slack API and handles authentication errors gracefully', async () => {
    const testReq = new Request('http://localhost:3000/api/connectors/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'slack',
        config: { botToken: 'xoxb-invalid-token-for-testing' },
      }),
    });

    const testRes = await testConnector(testReq as any);
    const testData = await testRes.json();

    expect(testData.success).toBe(false);
    expect(testData.error).toBeDefined();
    expect(testData.error).not.toContain('ByteString');
  });

  it('validates repository format on GitHub test', async () => {
    const testReq = new Request('http://localhost:3000/api/connectors/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'github',
        config: { token: 'ghp_test_token', repo: 'invalid-repo-without-slash' },
      }),
    });

    const testRes = await testConnector(testReq as any);
    const testData = await testRes.json();

    expect(testData.success).toBe(false);
    expect(testData.error).toContain('owner/repo');
  });

  it('tests Confluence and Google Drive validation gracefully', async () => {
    const testConfReq = new Request('http://localhost:3000/api/connectors/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'confluence',
        config: {
          domain: 'mock-site.atlassian.net',
          email: 'test@invalid.domain',
          apiToken: 'invalid_token_test',
        },
      }),
    });

    const confRes = await testConnector(testConfReq as any);
    const confData = await confRes.json();
    expect(confRes.status).toBeLessThan(500);
    expect(confData.success).toBe(false);

    const testGdriveReq = new Request('http://localhost:3000/api/connectors/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'google_drive',
        config: {
          apiKeyOrToken: 'invalid_google_api_key_for_testing',
          folderId: 'root',
        },
      }),
    });

    const gdriveRes = await testConnector(testGdriveReq as any);
    const gdriveData = await gdriveRes.json();
    expect(gdriveRes.status).toBeLessThan(500);
    expect(gdriveData.success).toBe(false);
  });

  it('rejects sync with informative guidance when required connector credentials are missing', async () => {
    const syncReq = new Request('http://localhost:3000/api/connectors/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'jira',
        config: { domain: '', email: '', apiToken: '' },
      }),
    });

    const syncRes = await syncConnector(syncReq as any);
    const syncData = await syncRes.json();

    expect(syncData.success).toBe(false);
    expect(syncData.error).toContain('required');
  });
});
