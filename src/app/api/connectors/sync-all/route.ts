import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations, sources, sourceChunks, memories, memoryEvidence, entities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { DocumentProcessor } from '@/lib/ingestion/processor';
import { extractKnowledge } from '@/lib/ingestion/extractor';
import { ai } from '@/lib/ai';
import { logAudit } from '@/lib/permissions/audit';
import { contentHash } from '@/lib/domain/contracts';
import { decryptSecret } from '@/lib/security/encryption';
import { fetchSlackMessagesAsDocument, fetchSlackChannels } from '@/lib/connectors/slack';
import { fetchGitHubPullRequestsAsDocument, fetchGitHubCommitsAsDocument } from '@/lib/connectors/github';
import { fetchJiraIssuesAsDocument } from '@/lib/connectors/jira';
import { fetchConfluencePagesAsDocument } from '@/lib/connectors/confluence';
import { fetchGoogleDriveDocuments } from '@/lib/connectors/google-drive';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // 1. Authorization: either Bearer CRON_SECRET or authenticated user
    const authHeader = request.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized = cronSecret && authHeader.replace(/^Bearer\s+/i, '') === cronSecret;

    const user = await getCurrentUser();
    if (!isCronAuthorized && !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Valid session or CRON_SECRET required.' }, { status: 401 });
    }

    const orgs = await db.query.organizations.findMany();
    const syncResults: Array<{ orgId: string; connector: string; success: boolean; itemCount?: number; error?: string }> = [];

    for (const org of orgs) {
      const settings = (org.settings || {}) as Record<string, any>;
      const connectors = (settings.connectors || {}) as Record<string, any>;

      for (const [type, rawConfig] of Object.entries(connectors)) {
        if (!rawConfig) continue;

        try {
          let fetchedDocument: { title: string; content: string; itemCount?: number } | null = null;

          if (type === 'slack') {
            const botToken = decryptSecret(rawConfig.botToken);
            if (!botToken) continue;
            let channelId = rawConfig.channelId;
            let channelName = rawConfig.channelName || 'general';
            if (!channelId) {
              const channels = await fetchSlackChannels(botToken).catch(() => []);
              if (channels.length > 0) {
                channelId = channels[0].id;
                channelName = channels[0].name;
              }
            }
            if (channelId) {
              const doc = await fetchSlackMessagesAsDocument(botToken, channelId, channelName, 30);
              fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.messageCount };
            }
          } else if (type === 'github') {
            const token = decryptSecret(rawConfig.token);
            const repo = rawConfig.repo;
            if (!token || !repo) continue;
            const mode = rawConfig.mode || 'pulls';
            if (mode === 'commits') {
              const doc = await fetchGitHubCommitsAsDocument(token, repo, 10);
              fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.commitCount };
            } else {
              const doc = await fetchGitHubPullRequestsAsDocument(token, repo, 10);
              fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.prCount };
            }
          } else if (type === 'jira') {
            const domain = rawConfig.domain;
            const email = rawConfig.email;
            const apiToken = decryptSecret(rawConfig.apiToken);
            if (!domain || !email || !apiToken) continue;
            const doc = await fetchJiraIssuesAsDocument(domain, email, apiToken, rawConfig.jql || 'ORDER BY updated DESC', 15);
            fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.issueCount };
          } else if (type === 'confluence') {
            const domain = rawConfig.domain;
            const email = rawConfig.email;
            const apiToken = decryptSecret(rawConfig.apiToken);
            if (!domain || !email || !apiToken) continue;
            const doc = await fetchConfluencePagesAsDocument(domain, email, apiToken, rawConfig.spaceKey, 10);
            fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.pageCount };
          } else if (type === 'google_drive') {
            const keyOrToken = decryptSecret(rawConfig.apiKeyOrToken || rawConfig.apiKey || rawConfig.token);
            if (!keyOrToken) continue;
            const doc = await fetchGoogleDriveDocuments(keyOrToken, rawConfig.folderId || 'root', 10);
            fetchedDocument = { title: doc.title, content: doc.content, itemCount: doc.fileCount };
          }

          if (fetchedDocument && fetchedDocument.content.trim()) {
            const sourceId = uuid();
            const hash = contentHash(org.id + type + fetchedDocument.content);

            const [newSource] = await db
              .insert(sources)
              .values({
                id: sourceId,
                organizationId: org.id,
                title: fetchedDocument.title,
                sourceType: type,
                mimeType: 'text/markdown',
                fileSize: Buffer.byteLength(fetchedDocument.content, 'utf-8'),
                content: fetchedDocument.content,
                accessPolicy: 'organization',
                status: 'completed',
                metadata: {
                  connectorType: type,
                  itemCount: fetchedDocument.itemCount,
                  syncedAt: new Date().toISOString(),
                  syncMode: 'background_cron',
                  contentHash: hash,
                },
              })
              .returning();

            const processor = new DocumentProcessor();
            const chunks = processor.chunkContent(fetchedDocument.content);
            const chunkEmbeddings = await ai.generateEmbeddings(chunks.map((c) => c.content));

            for (let i = 0; i < chunks.length; i++) {
              await db.insert(sourceChunks).values({
                id: uuid(),
                sourceId: newSource.id,
                organizationId: org.id,
                chunkIndex: chunks[i].chunkIndex,
                content: chunks[i].content,
                startOffset: chunks[i].startOffset,
                endOffset: chunks[i].endOffset,
                section: chunks[i].section || null,
                metadata: { connectorType: type, backgroundCron: true },
                embedding: chunkEmbeddings[i] || null,
              });
            }

            const existingEntities = await db.query.entities.findMany({
              where: eq(entities.organizationId, org.id),
            });
            const known = existingEntities.map((e) => ({ name: e.name, entityType: e.entityType }));
            const knowledge = await extractKnowledge(fetchedDocument.content.slice(0, 8000), known);

            for (const mem of knowledge.extraction.memories) {
              const memoryId = uuid();
              await db.insert(memories).values({
                id: memoryId,
                organizationId: org.id,
                memoryType: mem.memoryType,
                title: mem.title,
                description: mem.description,
                confidence: mem.confidence || 0.85,
                verificationStatus: 'verified',
                status: 'active',
                accessPolicy: 'organization',
                validFrom: new Date(),
                attributes: { connectorType: type, backgroundCron: true },
              });

              await db.insert(memoryEvidence).values({
                id: uuid(),
                memoryId,
                sourceId: newSource.id,
                evidenceType: 'supports',
                excerpt: mem.excerpt || fetchedDocument.content.slice(0, 200),
                confidence: 0.9,
              });
            }

            // Update lastSync timestamp
            const updatedConnectors = {
              ...connectors,
              [type]: {
                ...rawConfig,
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
              .where(eq(organizations.id, org.id));

            await logAudit({
              organizationId: org.id,
              action: 'scheduled_connector_synced',
              resourceType: 'source',
              resourceId: newSource.id,
              details: {
                connectorType: type,
                itemCount: fetchedDocument.itemCount,
                chunksCount: chunks.length,
              },
            });

            syncResults.push({ orgId: org.id, connector: type, success: true, itemCount: fetchedDocument.itemCount });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Sync failed';
          syncResults.push({ orgId: org.id, connector: type, success: false, error: msg });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        syncedCount: syncResults.filter((r) => r.success).length,
        results: syncResults,
      },
      message: `Background connector sync completed (${syncResults.filter((r) => r.success).length} connectors updated).`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Background sync runner failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

