import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/permissions/audit';
import { encryptConfigSecrets, decryptSecret } from '@/lib/security/encryption';

export async function GET() {
  try {
    const { organizationId } = await requireAuth();
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    const settings = (org?.settings || {}) as Record<string, any>;
    const rawConnectors = (settings.connectors || {}) as Record<string, any>;

    // Provide safe metadata without exposing secret tokens to the client
    const safeConnectors: Record<string, any> = {};
    for (const [key, cfg] of Object.entries(rawConnectors)) {
      if (!cfg) continue;
      const isConfigured = Boolean(cfg.token || cfg.botToken || cfg.apiToken || cfg.apiKey || cfg.apiKeyOrToken);
      const rawToken = decryptSecret(cfg.token || cfg.apiKeyOrToken || cfg.apiKey);
      const rawBotToken = decryptSecret(cfg.botToken);

      safeConnectors[key] = {
        ...cfg,
        isConfigured,
        // Strip secrets so form inputs never receive bullet character strings
        token: undefined,
        botToken: undefined,
        apiToken: undefined,
        apiKey: undefined,
        apiKeyOrToken: undefined,
        maskedPreview: rawToken
          ? `${rawToken.slice(0, 4)}••••${rawToken.slice(-3)}`
          : rawBotToken
          ? `${rawBotToken.slice(0, 5)}••••`
          : isConfigured
          ? '••••••••••••'
          : undefined,
      };
    }

    return NextResponse.json({ success: true, data: safeConnectors });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch connectors';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireRole('admin');
    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json(
        { success: false, error: 'Type and config are required.' },
        { status: 400 }
      );
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    const settings = (org?.settings || {}) as Record<string, any>;
    const existingConnectors = (settings.connectors || {}) as Record<string, any>;
    const existing = existingConnectors[type] || {};

    const cleanConfig = { ...config };

    // Preserve existing secrets if new input is empty or contains bullet character placeholders
    for (const secretKey of ['token', 'botToken', 'apiToken', 'apiKey', 'apiKeyOrToken']) {
      const val = cleanConfig[secretKey];
      if (!val || typeof val !== 'string' || !val.trim() || val.includes('•')) {
        if (existing[secretKey]) {
          cleanConfig[secretKey] = existing[secretKey];
        } else {
          delete cleanConfig[secretKey];
        }
      } else {
        cleanConfig[secretKey] = val.trim();
      }
    }

    const updatedConfig = {
      ...existing,
      ...cleanConfig,
      updatedAt: new Date().toISOString(),
      configuredBy: user.email,
    };

    // Encrypt secrets at rest using AES-256-GCM
    const encryptedConfig = encryptConfigSecrets(updatedConfig);

    const newSettings = {
      ...settings,
      connectors: {
        ...existingConnectors,
        [type]: encryptedConfig,
      },
    };

    await db
      .update(organizations)
      .set({
        settings: newSettings,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    await logAudit({
      organizationId,
      userId: user.id,
      action: 'connector_configured',
      resourceType: 'connector',
      details: { type, configuredBy: user.email, encrypted: true },
    });

    return NextResponse.json({
      success: true,
      message: `${type.toUpperCase()} configuration saved securely (AES-256-GCM encrypted).`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save connector';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === 'Unauthorized' ? 401 : 500 }
    );
  }
}
