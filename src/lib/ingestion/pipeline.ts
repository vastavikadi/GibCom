import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { withActor } from '@/lib/db/scoped';
import { ai } from '@/lib/ai';
import { extractionSchema, Actor } from '@/lib/domain/contracts';
import { loadBrain } from '@/lib/domain/store';
import { persistExtraction } from '@/lib/domain/memory';
import { DocumentProcessor, ContentChunk } from './processor';
import { extractKnowledge } from './extractor';

export async function runNextJob(): Promise<boolean> {
  // Claim persisted work atomically. An expired lease is reclaimable after a crash.
  const claimed = await db.execute(sql`update ingestion_jobs set status='processing', started_at=now(), updated_at=now(), current_step='Reading source', progress=5 where id=(select id from ingestion_jobs where status='queued' or (status='processing' and updated_at < now()-interval '3 minutes') order by created_at for update skip locked limit 1) returning *`);
  const job = claimed[0] as { id: string; organization_id: string; source_id: string } | undefined;
  if (!job) return false;
  const heartbeat = setInterval(() => { void db.update(s.ingestionJobs).set({ updatedAt: new Date() }).where(eq(s.ingestionJobs.id, job.id)).catch(() => console.error('[worker] heartbeat failed')); }, 30000);
  try {
    const source = await db.query.sources.findFirst({ where: and(eq(s.sources.id, job.source_id), eq(s.sources.organizationId, job.organization_id)) });
    if (!source || source.status === 'deleted' || !source.uploadedBy) throw new Error('Source is unavailable');
    const member = await db.query.memberships.findFirst({ where: and(eq(s.memberships.userId, source.uploadedBy), eq(s.memberships.organizationId, job.organization_id)) });
    if (!member) throw new Error('Uploader no longer belongs to this workspace');
    const actor: Actor = { userId: source.uploadedBy, organizationId: job.organization_id, role: member.role };
    const processor = new DocumentProcessor();
    const document = source.filePath ? await processor.extractContent(source.filePath, source.mimeType!) : { content: source.content || '', metadata: {}, pages: undefined };
    if (!document.content.trim()) throw new Error('No text was found in this source');
    if (document.content.length > 500000) throw new Error('Extracted text exceeds the 500,000 character processing limit');
    let chunks: ContentChunk[] = [];
    if (document.pages?.length) { let offset = 0; for (const [page, text] of document.pages.entries()) { for (const c of processor.chunkContent(text)) chunks.push({ ...c, chunkIndex: chunks.length, pageNumber: page + 1, startOffset: c.startOffset + offset, endOffset: c.endOffset + offset }); offset += text.length + 2; } }
    else chunks = processor.chunkContent(document.content);
    const known = await withActor(actor, async tx => (await loadBrain(tx, actor)).entities.map(e => ({ name: e.name, entityType: e.entityType })));
    const combined = extractionSchema.parse({ entities: [], memories: [], relationships: [] });
    let mode = 'evidence-only';
    const tokensBefore = ai.getTokensUsed();
    for (const [index, chunk] of chunks.entries()) {
      const result = await extractKnowledge(chunk.content, known);
      combined.entities.push(...result.extraction.entities); combined.memories.push(...result.extraction.memories); combined.relationships.push(...result.extraction.relationships); mode = result.mode;
      await db.update(s.ingestionJobs).set({ progress: 10 + Math.floor((index + 1) / chunks.length * 65), currentStep: `Extracted section ${index + 1} of ${chunks.length}`, updatedAt: new Date() }).where(eq(s.ingestionJobs.id, job.id));
    }
    const embeddings = await ai.generateEmbeddings(chunks.map(c => c.content));
    await withActor(actor, async tx => {
      await tx.execute(sql`select id from sources where id=${source.id} and organization_id=${actor.organizationId} for update`);
      const latest = await tx.query.sources.findFirst({ where: eq(s.sources.id, source.id) });
      if (!latest || latest.status === 'deleted') throw new Error('Source was deleted while processing');
      await tx.update(s.sources).set({ content: document.content, metadata: { ...(source.metadata as object), ...document.metadata } }).where(eq(s.sources.id, source.id));
      const result = await persistExtraction(tx, actor, { ...source, content: document.content }, combined, chunks, embeddings, mode);
      await tx.update(s.ingestionJobs).set({ status: 'completed', progress: 100, currentStep: 'Indexed and connected', completedAt: new Date(), updatedAt: new Date(), error: null, metadata: { ...result, mode, tokens: ai.getTokensUsed() - tokensBefore } }).where(eq(s.ingestionJobs.id, job.id));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed';
    console.error('[worker] job failed', job.id, message);
    await db.update(s.ingestionJobs).set({ status: 'failed', error: message.slice(0, 1000), currentStep: 'Failed — retry available', completedAt: new Date(), updatedAt: new Date() }).where(eq(s.ingestionJobs.id, job.id));
    await db.update(s.sources).set({ status: 'failed' }).where(and(eq(s.sources.id, job.source_id), eq(s.sources.organizationId, job.organization_id), sql`${s.sources.status} <> 'deleted'`));
  } finally { clearInterval(heartbeat); }
  return true;
}
