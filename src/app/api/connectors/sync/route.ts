import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import {
  organizations,
  sources,
  sourceChunks,
  memories,
  memoryEvidence,
  entities,
} from '@/lib/db/schema';
import { DocumentProcessor } from '@/lib/ingestion/processor';
import { extractKnowledge } from '@/lib/ingestion/extractor';
import { ai } from '@/lib/ai';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/permissions/audit';
import { contentHash } from '@/lib/domain/contracts';
import { fetchSlackMessagesAsDocument, fetchSlackChannels } from '@/lib/connectors/slack';
import {
  fetchGitHubPullRequestsAsDocument,
  fetchGitHubCommitsAsDocument,
} from '@/lib/connectors/github';
import { fetchJiraIssuesAsDocument } from '@/lib/connectors/jira';
import { fetchConfluencePagesAsDocument } from '@/lib/connectors/confluence';
import { fetchGoogleDriveDocuments } from '@/lib/connectors/google-drive';

// Helper to resolve secret value without bullet characters
function resolveSecret(val: any, fallback: any): string {
  if (typeof val === 'string' && val.trim().length > 0 && !val.includes('•') && !/^\*+$/.test(val.trim())) {
    return val.trim();
  }
  return typeof fallback === 'string' ? fallback.trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireAuth();
    const body = await request.json();
    const { type, config: overrideConfig } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Connector type is required (slack, github, jira, confluence, google_drive)' },
        { status: 400 }
      );
    }

    // 1. Load saved config or use override
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });
    const settings = (org?.settings || {}) as Record<string, any>;
    const savedConnectors = (settings.connectors || {}) as Record<string, any>;
    const saved = (savedConnectors[type] || {}) as Record<string, any>;
    const rawOverride = (overrideConfig || {}) as Record<string, any>;

    let fetchedDocument: { title: string; content: string; itemCount?: number };

    // 2. Fetch live data from the real service
    if (type === 'slack') {
      const botToken = resolveSecret(rawOverride.botToken, saved.botToken);
      const channelId = (rawOverride.channelId || saved.channelId || '').trim();
      let channelName = (rawOverride.channelName || saved.channelName || 'general').trim();
      const limit = Number(rawOverride.limit || saved.limit || 50);

      if (!botToken) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Slack Bot Token is missing. Please configure your Slack credentials first.',
          },
          { status: 400 }
        );
      }

      let targetChannelId = channelId;

      // Auto-detect first channel if not specified
      if (!targetChannelId) {
        const channels = await fetchSlackChannels(botToken);
        if (!channels.length) {
          throw new Error('No accessible channels found in this Slack workspace. Invite your Bot to a channel first.');
        }
        targetChannelId = channels[0].id;
        channelName = channels[0].name;
      }

      const doc = await fetchSlackMessagesAsDocument(botToken, targetChannelId, channelName, limit);
      fetchedDocument = {
        title: doc.title,
        content: doc.content,
        itemCount: doc.messageCount,
      };
    } else if (type === 'github') {
      const token = resolveSecret(rawOverride.token, saved.token);
      const repo = (rawOverride.repo || saved.repo || '').trim();
      const limit = Number(rawOverride.limit || saved.limit || 15);
      const mode = (rawOverride.mode || saved.mode || 'pulls').trim();

      if (!token || !repo) {
        return NextResponse.json(
          {
            success: false,
            error:
              'GitHub Token and Repository (owner/repo) are required. Please configure GitHub credentials first.',
          },
          { status: 400 }
        );
      }

      if (mode === 'commits') {
        const doc = await fetchGitHubCommitsAsDocument(token, repo, limit);
        fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.commitCount };
      } else {
        const doc = await fetchGitHubPullRequestsAsDocument(token, repo, limit);
        fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.prCount };
      }
    } else if (type === 'jira') {
      const domain = (rawOverride.domain || saved.domain || '').trim();
      const email = (rawOverride.email || saved.email || '').trim();
      const apiToken = resolveSecret(rawOverride.apiToken, saved.apiToken);
      const jql = (rawOverride.jql || saved.jql || 'ORDER BY updated DESC').trim();
      const limit = Number(rawOverride.limit || saved.limit || 25);

      if (!domain || !email || !apiToken) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Jira Domain, Account Email, and API Token are required. Please configure Jira credentials first.',
          },
          { status: 400 }
        );
      }

      const doc = await fetchJiraIssuesAsDocument(domain, email, apiToken, jql, limit);
      fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.issueCount };
    } else if (type === 'confluence') {
      const domain = (rawOverride.domain || saved.domain || '').trim();
      const email = (rawOverride.email || saved.email || '').trim();
      const apiToken = resolveSecret(rawOverride.apiToken, saved.apiToken);
      const spaceKey = (rawOverride.spaceKey || saved.spaceKey || '').trim();
      const limit = Number(rawOverride.limit || saved.limit || 20);

      if (!domain || !email || !apiToken) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Confluence Domain, Account Email, and API Token are required. Please configure Confluence credentials first.',
          },
          { status: 400 }
        );
      }

      const doc = await fetchConfluencePagesAsDocument(domain, email, apiToken, spaceKey, limit);
      fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.pageCount };
    } else if (type === 'google_drive') {
      const keyOrToken =
        resolveSecret(rawOverride.apiKeyOrToken, saved.apiKeyOrToken) ||
        resolveSecret(rawOverride.apiKey, saved.apiKey) ||
        resolveSecret(rawOverride.token, saved.token);
      const folderId = (rawOverride.folderId || saved.folderId || 'root').trim();
      const limit = Number(rawOverride.limit || saved.limit || 15);

      if (!keyOrToken) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Google Drive OAuth Bearer Token or API Key is required. Please configure Google Drive credentials first.',
          },
          { status: 400 }
        );
      }

      const doc = await fetchGoogleDriveDocuments(keyOrToken, folderId, limit);
      fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.fileCount };
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported connector type: ${type}` },
        { status: 400 }
      );
    }

    if (!fetchedDocument.content.trim()) {
      return NextResponse.json({
        success: false,
        error: `Connected to ${type}, but no data was returned for the specified filters.`,
      });
    }

    // 3. Insert real source record into PostgreSQL
    const sourceId = uuid();
    const hash = contentHash(organizationId + type + fetchedDocument.content);

    const [newSource] = await db
      .insert(sources)
      .values({
        id: sourceId,
        organizationId,
        title: fetchedDocument.title,
        sourceType: type,
        mimeType: 'text/markdown',
        fileSize: Buffer.byteLength(fetchedDocument.content, 'utf-8'),
        content: fetchedDocument.content,
        uploadedBy: user.id,
        accessPolicy: 'organization',
        status: 'completed',
        metadata: {
          connectorType: type,
          itemCount: fetchedDocument.itemCount,
          syncedAt: new Date().toISOString(),
          syncedBy: user.email,
          contentHash: hash,
        },
      })
      .returning();

    // 4. Chunk document content
    const processor = new DocumentProcessor();
    const chunks = processor.chunkContent(fetchedDocument.content);

    // 5. Generate embeddings & insert source chunks with pgvector
    const chunkEmbeddings = await ai.generateEmbeddings(chunks.map((c) => c.content));
    for (let i = 0; i < chunks.length; i++) {
      await db.insert(sourceChunks).values({
        id: uuid(),
        sourceId: newSource.id,
        organizationId,
        chunkIndex: chunks[i].chunkIndex,
        content: chunks[i].content,
        startOffset: chunks[i].startOffset,
        endOffset: chunks[i].endOffset,
        section: chunks[i].section || null,
        metadata: { connectorType: type },
        embedding: chunkEmbeddings[i] || null,
      });
    }

    // 6. Extract entities and memories
    const existingEntities = await db.query.entities.findMany({
      where: eq(entities.organizationId, organizationId),
    });
    const known = existingEntities.map((e) => ({ name: e.name, entityType: e.entityType }));
    const knowledge = await extractKnowledge(fetchedDocument.content.slice(0, 10000), known);

    const memoriesCreated: string[] = [];
    for (const mem of knowledge.extraction.memories) {
      const memoryId = uuid();
      await db.insert(memories).values({
        id: memoryId,
        organizationId,
        memoryType: mem.memoryType,
        title: mem.title,
        description: mem.description,
        confidence: mem.confidence || 0.85,
        verificationStatus: 'verified',
        status: 'active',
        createdBy: user.id,
        accessPolicy: 'organization',
        validFrom: new Date(),
        attributes: {
          connectorType: type,
          sourceId: newSource.id,
        },
      });

      await db.insert(memoryEvidence).values({
        id: uuid(),
        memoryId,
        sourceId: newSource.id,
        evidenceType: 'supports',
        excerpt: mem.excerpt || fetchedDocument.content.slice(0, 300),
        confidence: 0.9,
      });

      memoriesCreated.push(memoryId);
    }

    // 7. Update lastSync in organizational settings
    const updatedConnectors = {
      ...savedConnectors,
      [type]: {
        ...(savedConnectors[type] || {}),
        lastSync: new Date().toISOString(),
        lastSyncItems: fetchedDocument.itemCount,
        lastSyncStatus: 'success',
      },
    };

    await db
      .update(organizations)
      .set({
        settings: { ...settings, connectors: updatedConnectors },
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    // 8. Audit log
    await logAudit({
      organizationId,
      userId: user.id,
      action: 'live_connector_synced',
      resourceType: 'source',
      resourceId: newSource.id,
      details: {
        connectorType: type,
        chunksCount: chunks.length,
        memoriesCreated: memoriesCreated.length,
        itemCount: fetchedDocument.itemCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sourceId: newSource.id,
        title: fetchedDocument.title,
        connectorType: type,
        chunksCount: chunks.length,
        memoriesCreated: memoriesCreated.length,
        itemCount: fetchedDocument.itemCount,
      },
      message: `Live data from ${type.toUpperCase()} synced and indexed (${fetchedDocument.itemCount || chunks.length} items captured).`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg.includes('missing') || msg.includes('required') ? 400 : 500 }
    );
  }
}

