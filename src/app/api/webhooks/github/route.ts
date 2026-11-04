import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { organizations, sources, sourceChunks, memories, memoryEvidence, entities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { DocumentProcessor } from '@/lib/ingestion/processor';
import { extractKnowledge } from '@/lib/ingestion/extractor';
import { ai } from '@/lib/ai';
import { logAudit } from '@/lib/permissions/audit';
import { contentHash } from '@/lib/domain/contracts';

function verifySignature(payload: string, signature: string | null, secret?: string): boolean {
  if (!secret) return true; // If no secret configured, allow (e.g. in dev/testing)
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(payload).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const event = request.headers.get('x-github-event') || 'ping';
    const signature = request.headers.get('x-hub-signature-256');

    // 1. Verify GitHub webhook signature if secret configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ success: false, error: 'Invalid HMAC signature' }, { status: 401 });
    }

    if (event === 'ping') {
      return NextResponse.json({ success: true, message: 'Pong! Webhook connected.' });
    }

    const payload = JSON.parse(rawBody);
    const repoFullName = payload.repository?.full_name;

    // 2. Identify the matching organization by looking up configured GitHub repo
    const orgs = await db.query.organizations.findMany();
    let targetOrgId: string | null = null;

    for (const org of orgs) {
      const settings = (org.settings || {}) as Record<string, any>;
      const ghConfig = settings.connectors?.github;
      if (ghConfig?.repo && repoFullName && ghConfig.repo.toLowerCase() === repoFullName.toLowerCase()) {
        targetOrgId = org.id;
        break;
      }
    }

    // Default to first organization if no exact repo match found
    if (!targetOrgId && orgs.length > 0) {
      targetOrgId = orgs[0].id;
    }

    if (!targetOrgId) {
      return NextResponse.json({ success: false, error: 'No organization configured for this repository' }, { status: 404 });
    }

    let documentContent = '';
    let documentTitle = '';

    if (event === 'pull_request') {
      const pr = payload.pull_request;
      const action = payload.action;
      documentTitle = `GitHub PR #${pr.number}: ${pr.title} (${action})`;
      documentContent = [
        `# ${documentTitle}`,
        `Repository: ${repoFullName}`,
        `Author: @${pr.user?.login || 'unknown'}`,
        `Status: ${pr.state} | Merged: ${pr.merged ? 'Yes' : 'No'}`,
        `Branch: ${pr.head?.ref} -> ${pr.base?.ref}`,
        `URL: ${pr.html_url}`,
        '',
        '## Description & Context',
        pr.body || 'No description provided.',
      ].join('\n');
    } else if (event === 'push') {
      const commits = payload.commits || [];
      if (!commits.length) {
        return NextResponse.json({ success: true, message: 'Push event contained no commits' });
      }
      documentTitle = `GitHub Push: ${commits.length} commits on ${payload.ref} (${repoFullName})`;
      const commitLines = commits.map((c: any) => `- **${c.id.slice(0, 7)}** by ${c.author?.name}: ${c.message}`).join('\n');
      documentContent = [
        `# ${documentTitle}`,
        `Pushed by: @${payload.pusher?.name || 'unknown'}`,
        `Compare: ${payload.compare}`,
        '',
        '## Commit Log',
        commitLines,
      ].join('\n');
    } else {
      return NextResponse.json({ success: true, message: `Event ${event} acknowledged without indexing` });
    }

    // 3. Insert real source record into PostgreSQL
    const sourceId = uuid();
    const hash = contentHash(targetOrgId + 'github-webhook' + documentContent);

    const [newSource] = await db
      .insert(sources)
      .values({
        id: sourceId,
        organizationId: targetOrgId,
        title: documentTitle,
        sourceType: 'github',
        mimeType: 'text/markdown',
        fileSize: Buffer.byteLength(documentContent, 'utf-8'),
        content: documentContent,
        accessPolicy: 'organization',
        status: 'completed',
        metadata: {
          connectorType: 'github',
          webhookEvent: event,
          repository: repoFullName,
          receivedAt: new Date().toISOString(),
          contentHash: hash,
        },
      })
      .returning();

    // 4. Chunk & embed with pgvector
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
        metadata: { connectorType: 'github', webhook: true },
        embedding: chunkEmbeddings[i] || null,
      });
    }

    // 5. Extract knowledge & memories
    const existingEntities = await db.query.entities.findMany({
      where: eq(entities.organizationId, targetOrgId),
    });
    const known = existingEntities.map((e) => ({ name: e.name, entityType: e.entityType }));
    const knowledge = await extractKnowledge(documentContent.slice(0, 10000), known);

    for (const mem of knowledge.extraction.memories) {
      const memoryId = uuid();
      await db.insert(memories).values({
        id: memoryId,
        organizationId: targetOrgId,
        memoryType: mem.memoryType,
        title: mem.title,
        description: mem.description,
        confidence: mem.confidence || 0.88,
        verificationStatus: 'verified',
        status: 'active',
        accessPolicy: 'organization',
        validFrom: new Date(),
        attributes: { connectorType: 'github', webhook: true },
      });

      await db.insert(memoryEvidence).values({
        id: uuid(),
        memoryId,
        sourceId: newSource.id,
        evidenceType: 'supports',
        excerpt: mem.excerpt || documentContent.slice(0, 250),
        confidence: 0.9,
      });
    }

    // 6. Log audit trail
    await logAudit({
      organizationId: targetOrgId,
      action: 'webhook_github_ingested',
      resourceType: 'source',
      resourceId: newSource.id,
      details: {
        event,
        repository: repoFullName,
        chunksCount: chunks.length,
        memoriesCount: knowledge.extraction.memories.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sourceId: newSource.id,
        title: documentTitle,
        chunksCount: chunks.length,
        memoriesCreated: knowledge.extraction.memories.length,
      },
      message: `GitHub webhook event '${event}' ingested into organizational memory.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook processing failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

