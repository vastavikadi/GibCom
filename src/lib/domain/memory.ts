import { and, eq, sql } from 'drizzle-orm';
import { Transaction } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { Actor, Extraction, normalizeName, ProposedMemory, quoteSupported } from './contracts';
import { ContentChunk } from '@/lib/ingestion/processor';
import { audit } from './store';

export async function recordVersion(
  tx: Transaction,
  memory: typeof s.memories.$inferSelect,
  actorId: string,
  reason: string,
) {
  await tx
    .insert(s.memoryVersions)
    .values({
      memoryId: memory.id,
      version: memory.version ?? 1,
      title: memory.title,
      description: memory.description,
      attributes: memory.attributes,
      confidence: memory.confidence,
      verificationStatus: memory.verificationStatus,
      changedBy: actorId,
      changeReason: reason,
    });
}

export async function persistExtraction(
  tx: Transaction,
  actor: Actor,
  source: typeof s.sources.$inferSelect,
  extraction: Extraction,
  chunks: ContentChunk[],
  embeddings: (number[] | null)[],
  mode: string,
) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${actor.organizationId}))`);

  const existingChunks = await tx
    .select()
    .from(s.sourceChunks)
    .where(and(eq(s.sourceChunks.organizationId, actor.organizationId), eq(s.sourceChunks.sourceId, source.id)));
  if (existingChunks.length) return { duplicate: true, memories: 0 };

  const content = source.content || chunks.map((c) => c.content).join('\n');
  if (
    extraction.memories.some((m) => !quoteSupported(m.excerpt, content)) ||
    extraction.relationships.some((r) => !quoteSupported(r.excerpt, content))
  ) {
    throw new Error('Evidence quotes must match source content');
  }

  const chunkRows = [];
  for (const [i, chunk] of chunks.entries()) {
    const [row] = await tx
      .insert(s.sourceChunks)
      .values({
        sourceId: source.id,
        organizationId: actor.organizationId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        section: chunk.section,
        pageNumber: chunk.pageNumber,
        embedding: (embeddings[i] as any) ?? null,
        metadata: { embeddingModel: embeddings[i] ? (process.env.EMBEDDING_MODEL_ID || 'deterministic') : null },
      })
      .returning();
    chunkRows.push(row);
  }

  const existingEntities = await tx.select().from(s.entities).where(eq(s.entities.organizationId, actor.organizationId));
  const entityMap = new Map<string, string>();
  for (const entity of existingEntities) entityMap.set(normalizeName(entity.name), entity.id);

  const proposedEntities = [...extraction.entities];
  if (
    !proposedEntities.length &&
    !extraction.memories.some((m) => m.relatedEntities.some((name) => entityMap.has(normalizeName(name))))
  ) {
    proposedEntities.push({ name: source.title, type: 'document', description: '', attributes: {} });
  }

  for (const entity of proposedEntities) {
    const old = existingEntities.find(
      (e) => normalizeName(e.name) === normalizeName(entity.name) && e.entityType === entity.type,
    );
    if (old) {
      entityMap.set(normalizeName(entity.name), old.id);
      await tx
        .update(s.entities)
        .set({ updatedAt: new Date() })
        .where(and(eq(s.entities.organizationId, actor.organizationId), eq(s.entities.id, old.id)));
    } else {
      const [created] = await tx
        .insert(s.entities)
        .values({
          organizationId: actor.organizationId,
          entityType: entity.type,
          name: entity.name,
          description: entity.description,
          attributes: entity.attributes,
        })
        .returning();
      entityMap.set(normalizeName(entity.name), created.id);
      existingEntities.push(created);
    }
  }

  let memoryCount = 0;
  const seen = new Set<string>();

  for (const memory of extraction.memories) {
    const key = normalizeName(memory.title + ' ' + memory.description);
    if (seen.has(key)) continue;
    seen.add(key);

    const relatedIds = [
      ...new Set(
        memory.relatedEntities
          .map((name) => entityMap.get(normalizeName(name)))
          .filter((id): id is string => !!id),
      ),
    ];
    if (!relatedIds.length) {
      const docId = entityMap.get(normalizeName(source.title));
      if (docId) relatedIds.push(docId);
    }

    const [saved] = await tx
      .insert(s.memories)
      .values({
        organizationId: actor.organizationId,
        memoryType: memory.memoryType,
        title: memory.title,
        description: memory.description,
        subjectEntityId: relatedIds[0] || null,
        relatedEntityIds: relatedIds,
        attributes: { ...memory.attributes, extractionMode: mode },
        validFrom: memory.validFrom ? new Date(memory.validFrom) : null,
        validUntil: memory.validUntil ? new Date(memory.validUntil) : null,
        confidence: memory.confidence,
        verificationStatus: mode === 'seed' ? 'supported' : 'unverified',
        accessPolicy: 'inherit_source',
        createdBy: actor.userId,
        version: 1,
      })
      .returning();

    const supportingChunk = chunkRows.find((c) => quoteSupported(memory.excerpt, c.content));
    await tx.insert(s.memoryEvidence).values({
      memoryId: saved.id,
      sourceId: source.id,
      sourceChunkId: supportingChunk?.id ?? null,
      excerpt: memory.excerpt,
      confidence: memory.confidence,
    });

    await recordVersion(tx, saved, actor.userId, 'Captured from source');

    if (saved.memoryType === 'decision') {
      await tx.insert(s.decisions).values({
        organizationId: actor.organizationId,
        memoryId: saved.id,
        entityId: saved.subjectEntityId,
        title: saved.title,
        description: saved.description,
        rationale: typeof memory.attributes.rationale === 'string' ? memory.attributes.rationale : null,
        alternatives: (memory.attributes.alternatives as any) ?? [],
        madeAt: saved.validFrom,
      });
    }

    if (saved.validFrom) {
      await tx.insert(s.events).values({
        organizationId: actor.organizationId,
        entityId: saved.subjectEntityId,
        title: saved.title,
        description: saved.description,
        eventType: saved.memoryType,
        occurredAt: saved.validFrom,
        metadata: { sourceId: source.id, memoryId: saved.id },
      });
    }

    memoryCount++;
  }

  for (const relationship of extraction.relationships) {
    const sourceEntityId = entityMap.get(normalizeName(relationship.source));
    const targetEntityId = entityMap.get(normalizeName(relationship.target));
    if (!sourceEntityId || !targetEntityId) continue;

    await tx.insert(s.relationships).values({
      organizationId: actor.organizationId,
      sourceEntityId,
      targetEntityId,
      relationshipType: relationship.type,
      confidence: relationship.confidence,
      evidenceSourceIds: [source.id],
      attributes: { description: relationship.description, excerpt: relationship.excerpt },
      validFrom: relationship.validFrom ? new Date(relationship.validFrom) : null,
      validUntil: relationship.validUntil ? new Date(relationship.validUntil) : null,
    });
  }

  await tx
    .update(s.sources)
    .set({
      status: 'completed',
      metadata: { ...(source.metadata as object), extractionMode: mode },
      updatedAt: new Date(),
    })
    .where(and(eq(s.sources.id, source.id), eq(s.sources.organizationId, actor.organizationId)));

  await audit(tx, actor, 'source_processed', source.id, {
    mode,
    memories: memoryCount,
    entities: proposedEntities.length,
    relationships: extraction.relationships.length,
  });

  return { duplicate: false, memories: memoryCount };
}
