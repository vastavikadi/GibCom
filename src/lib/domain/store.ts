import { and, eq } from 'drizzle-orm';
import { Transaction } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { Actor } from './contracts';
import { allEvidenceVisible, canReadSource } from '@/lib/permissions/policy';

export async function loadBrain(tx: Transaction, actor: Actor) {
  const org = actor.organizationId;

  // 1. All sources the user has permission to read
  const allSources = await tx.select().from(s.sources).where(eq(s.sources.organizationId, org));
  const sources = allSources.filter((source) => canReadSource(actor, source));
  const sourceIds = new Set(sources.map((source) => source.id));

  // 2. Active memories with permission check
  const rawMemories = await tx.select().from(s.memories).where(eq(s.memories.organizationId, org));
  const evidence = await tx
    .select({ evidence: s.memoryEvidence })
    .from(s.memoryEvidence)
    .innerJoin(s.memories, eq(s.memories.id, s.memoryEvidence.memoryId))
    .where(eq(s.memories.organizationId, org));

  const byMemory = new Map<string, typeof s.memoryEvidence.$inferSelect[]>();
  for (const { evidence: e } of evidence) {
    byMemory.set(e.memoryId, [...(byMemory.get(e.memoryId) || []), e]);
  }

  const memories = rawMemories
    .filter((m) => {
      if (m.status === 'deleted') return false;
      const memEvidenceSources = (byMemory.get(m.id) || []).map((e) => e.sourceId || '').filter(Boolean);
      return allEvidenceVisible(memEvidenceSources, sourceIds);
    })
    .map((m) => ({
      ...m,
      evidence: (byMemory.get(m.id) || [])
        .map((e) => ({
          ...e,
          source: sources.find((source) => source.id === e.sourceId),
        }))
        .filter((e) => !!e.source),
    }));

  // 3. Entities
  const entities = (await tx.select().from(s.entities).where(eq(s.entities.organizationId, org))).filter(
    (e) => e.status === 'active',
  );
  const entityIds = new Set(entities.map((e) => e.id));

  // 4. Relationships
  const relationships = (await tx.select().from(s.relationships).where(eq(s.relationships.organizationId, org)))
    .filter((r) => entityIds.has(r.sourceEntityId) && entityIds.has(r.targetEntityId) && allEvidenceVisible(r.evidenceSourceIds, sourceIds))
    .map((r) => ({
      ...r,
      sourceEntity: entities.find((e) => e.id === r.sourceEntityId)!,
      targetEntity: entities.find((e) => e.id === r.targetEntityId)!,
    }));

  // 5. Source chunks
  const chunks = (await tx.select().from(s.sourceChunks).where(eq(s.sourceChunks.organizationId, org))).filter((c) =>
    sourceIds.has(c.sourceId),
  );

  // 6. Events
  const events = (await tx.select().from(s.events).where(eq(s.events.organizationId, org))).filter(
    (e) => !e.entityId || entityIds.has(e.entityId),
  );

  return { sources, sourceIds, memories, entities, relationships, chunks, events };
}

export type Brain = Awaited<ReturnType<typeof loadBrain>>;

export async function audit(
  tx: Transaction,
  actor: Actor,
  action: string,
  resourceId?: string,
  details: Record<string, unknown> = {},
) {
  await tx.insert(s.auditLogs).values({
    organizationId: actor.organizationId,
    userId: actor.userId,
    action,
    resourceId,
    details,
  });
}

export function publicSource(source: typeof s.sources.$inferSelect) {
  const { filePath, ...rest } = source;
  return rest;
}

export function publicMemory(memory: Brain['memories'][number]) {
  const { embedding, ...rest } = memory;
  return {
    ...rest,
    evidence: memory.evidence.map((e) => ({
      ...e,
      source: e.source ? publicSource(e.source) : undefined,
    })),
  };
}
