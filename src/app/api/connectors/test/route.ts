import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { testSlackAuth, fetchSlackChannels } from '@/lib/connectors/slack';
import { testGitHubAuth } from '@/lib/connectors/github';
import { testJiraAuth } from '@/lib/connectors/jira';
import { testConfluenceAuth } from '@/lib/connectors/confluence';
import { testGoogleDriveAuth } from '@/lib/connectors/google-drive';
import { decryptSecret } from '@/lib/security/encryption';

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireAuth();
    const body = await request.json();
    const { type, config = {} } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Type is required' },
        { status: 400 }
      );
    }

    // Load saved settings to allow testing already-configured credentials
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });
    const settings = (org?.settings || {}) as Record<string, any>;
    const savedConnectors = (settings.connectors || {}) as Record<string, any>;
    const saved = savedConnectors[type] || {};

    // Helper to resolve secret without bullet characters and decrypt from storage
    const resolveSecret = (incoming?: string, fallback?: string): string => {
      if (incoming && typeof incoming === 'string' && incoming.trim() && !incoming.includes('•')) {
        return incoming.trim();
      }
      return decryptSecret(fallback || '');
    };

    if (type === 'slack') {
      const botToken = resolveSecret(config.botToken, saved.botToken);
      if (!botToken) {
        return NextResponse.json(
          { success: false, error: 'Slack Bot User OAuth Token is required (e.g. xoxb-...)' },
          { status: 400 }
        );
      }

      const auth = await testSlackAuth(botToken);
      if (!auth.ok) {
        return NextResponse.json({
          success: false,
          error: auth.error || 'Slack authentication failed',
        });
      }

      const channels = await fetchSlackChannels(botToken);
      return NextResponse.json({
        success: true,
        data: {
          team: auth.team,
          user: auth.user,
          channelsCount: channels.length,
          channels: channels.slice(0, 10),
        },
        message: `Connected to Slack team "${auth.team}" as ${auth.user} (${channels.length} channels available).`,
      });
    }

    if (type === 'github') {
      const token = resolveSecret(config.token, saved.token);
      const repo = (config.repo || saved.repo || '').trim();

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'GitHub Personal Access Token is required' },
          { status: 400 }
        );
      }

      const auth = await testGitHubAuth(token, repo);
      if (!auth.ok) {
        return NextResponse.json({
          success: false,
          error: auth.error || 'GitHub connection failed',
        });
      }

      return NextResponse.json({
        success: true,
        data: auth,
        message: auth.fullName
          ? `Connected to GitHub repo "${auth.fullName}" (user: @${auth.user || 'authorized'}, branch: ${auth.defaultBranch || 'main'}).`
          : `Connected to GitHub as @${auth.user}.`,
      });
    }

    if (type === 'jira') {
      const domain = (config.domain || saved.domain || '').trim();
      const email = (config.email || saved.email || '').trim();
      const apiToken = resolveSecret(config.apiToken, saved.apiToken);

      if (!domain || !email || !apiToken) {
        return NextResponse.json(
          { success: false, error: 'Jira Domain, Account Email, and API Token are all required' },
          { status: 400 }
        );
      }

      const auth = await testJiraAuth(domain, email, apiToken);
      if (!auth.ok) {
        return NextResponse.json({
          success: false,
          error: auth.error || 'Jira Cloud connection failed',
        });
      }

      return NextResponse.json({
        success: true,
        data: auth,
        message: `Connected to Jira Cloud as ${auth.displayName} (${auth.emailAddress}).`,
      });
    }

    if (type === 'confluence') {
      const domain = (config.domain || saved.domain || '').trim();
      const email = (config.email || saved.email || '').trim();
      const apiToken = resolveSecret(config.apiToken, saved.apiToken);
      const spaceKey = (config.spaceKey || saved.spaceKey || '').trim();

      if (!domain || !email || !apiToken) {
        return NextResponse.json(
          { success: false, error: 'Confluence Domain, Account Email, and API Token are all required' },
          { status: 400 }
        );
      }

      const auth = await testConfluenceAuth(domain, email, apiToken, spaceKey);
      if (!auth.ok) {
        return NextResponse.json({
          success: false,
          error: auth.error || 'Confluence Cloud connection failed',
        });
      }

      const spacesMsg = auth.spacesCount ? ` (${auth.spacesCount} spaces accessible)` : '';
      return NextResponse.json({
        success: true,
        data: auth,
        message: `Connected to Confluence as ${auth.displayName}${spacesMsg}.`,
      });
    }

    if (type === 'google_drive') {
      const keyOrToken =
        resolveSecret(config.apiKeyOrToken, saved.apiKeyOrToken) ||
        resolveSecret(config.apiKey, saved.apiKey) ||
        resolveSecret(config.token, saved.token);
      const folderId = (config.folderId || saved.folderId || 'root').trim();

      if (!keyOrToken) {
        return NextResponse.json(
          { success: false, error: 'Google Drive OAuth Bearer Token or API Key is required' },
          { status: 400 }
        );
      }

      const auth = await testGoogleDriveAuth(keyOrToken, folderId);
      if (!auth.ok) {
        return NextResponse.json({
          success: false,
          error: auth.error || 'Google Drive connection failed',
        });
      }

      return NextResponse.json({
        success: true,
        data: auth,
        message: `Connected to Google Drive (${auth.folderName}: ${auth.filesCount} files accessible).`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported connector type: ${type}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Test failed';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === 'Unauthorized' ? 401 : 500 }
    );
  }
}
