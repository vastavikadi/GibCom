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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Handle Slack URL verification challenge for initial App setup
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // 2. Handle Event Subscriptions
    if (body.type === 'event_callback') {
      const event = body.event;

      // Filter: only ingest regular channel messages with content (skip bot loops and deletions)
      if (event?.type === 'message' && event.text && !event.bot_id && !event.subtype) {
        const teamId = body.team_id;

        // Find organization matching Slack workspace or default to first
        const orgs = await db.query.organizations.findMany();
        let targetOrgId = orgs[0]?.id;

        if (!targetOrgId) {
          return NextResponse.json({ ok: true, message: 'No organization found' });
        }

        const documentTitle = `Slack Discussion in #${event.channel || 'channel'} — ${new Date().toLocaleDateString()}`;
        const documentContent = [
          `# ${documentTitle}`,
          `Channel ID: ${event.channel}`,
          `User: ${event.user || 'Team Member'}`,
          `Timestamp: ${new Date(parseFloat(event.ts) * 1000).toISOString()}`,
          '',
          '## Message Text',
          event.text,
        ].join('\n');

        const sourceId = uuid();
        const hash = contentHash(targetOrgId + 'slack-webhook' + documentContent);

        const [newSource] = await db
          .insert(sources)
          .values({
            id: sourceId,
            organizationId: targetOrgId,
            title: documentTitle,
            sourceType: 'slack',
            mimeType: 'text/markdown',
            fileSize: Buffer.byteLength(documentContent, 'utf-8'),
            content: documentContent,
            accessPolicy: 'organization',
            status: 'completed',
            metadata: {
              connectorType: 'slack',
              channelId: event.channel,
              receivedAt: new Date().toISOString(),
              contentHash: hash,
            },
          })
          .returning();

        const processor = new DocumentProcessor();
        const chunks = processor.chunkContent(documentContent);
        const chunkEmbeddings = await ai.generateEmbeddings(chunks.map((c) => c.content));

        for (let i = 0; i < chunks.length; i++) {
          await db.insert(sourceChunks).values({
            id: uuid(),
            sourceId: newSource.id,
            organizationId: targetOrgId,
            chunkIndex: chunks[i].chunkIndex,
            content: chunks[i].content,
            startOffset: chunks[i].startOffset,
            endOffset: chunks[i].endOffset,
            section: chunks[i].section || null,
            metadata: { connectorType: 'slack', webhook: true },
            embedding: chunkEmbeddings[i] || null,
          });
        }

        const existingEntities = await db.query.entities.findMany({
          where: eq(entities.organizationId, targetOrgId),
        });
        const known = existingEntities.map((e) => ({ name: e.name, entityType: e.entityType }));
        const knowledge = await extractKnowledge(documentContent.slice(0, 5000), known);

        for (const mem of knowledge.extraction.memories) {
          const memoryId = uuid();
          await db.insert(memories).values({
            id: memoryId,
            organizationId: targetOrgId,
            memoryType: mem.memoryType,
            title: mem.title,
            description: mem.description,
            confidence: mem.confidence || 0.85,
            verificationStatus: 'verified',
            status: 'active',
            accessPolicy: 'organization',
            validFrom: new Date(),
            attributes: { connectorType: 'slack', webhook: true },
          });

          await db.insert(memoryEvidence).values({
            id: uuid(),
            memoryId,
            sourceId: newSource.id,
            evidenceType: 'supports',
            excerpt: mem.excerpt || documentContent.slice(0, 200),
            confidence: 0.9,
          });
        }

        await logAudit({
          organizationId: targetOrgId,
          action: 'webhook_slack_ingested',
          resourceType: 'source',
          resourceId: newSource.id,
          details: { channel: event.channel, user: event.user },
        });

        return NextResponse.json({ ok: true, sourceId: newSource.id });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Slack webhook error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

