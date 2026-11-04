import { z } from 'zod';
import { ai } from '@/lib/ai';
import { PROMPTS } from '@/lib/ai/prompts';
import { db } from '@/lib/db';
import { entities } from '@/lib/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import type { ExtractedEntity, ExtractedMemory, ExtractedRelationship } from '@/types';
import type { Extraction } from '@/lib/domain/contracts';

const entitiesSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      description: z.string().default(''),
      attributes: z.record(z.unknown()).default({}),
    }),
  ),
});

const memoriesSchema = z.object({
  memories: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      memoryType: z.string().default('experience'),
      confidence: z.number().default(0.5),
      attributes: z.record(z.unknown()).default({}),
      relatedEntities: z.array(z.string()).default([]),
    }),
  ),
});

const relationshipsSchema = z.object({
  relationships: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      type: z.string().default('RELATED_TO'),
      description: z.string().default(''),
      confidence: z.number().default(0.5),
    }),
  ),
});

export interface ResolvedEntity extends ExtractedEntity {
  existingId?: string;
  isNew: boolean;
}

export class KnowledgeExtractor {
  async extractEntities(text: string, existingEntities: string[] = []): Promise<ExtractedEntity[]> {
    try {
      const prompt = PROMPTS.EXTRACT_ENTITIES(text.slice(0, 8000), existingEntities);
      const result = await ai.extractStructured(prompt, entitiesSchema);
      return result.entities.map((e) => ({
        name: e.name,
        type: e.type,
        description: e.description ?? '',
        attributes: e.attributes ?? {},
      }));
    } catch (err) {
      console.error('Entity extraction failed:', err);
      return [];
    }
  }

  async extractMemories(text: string, extractedEntities: ExtractedEntity[]): Promise<ExtractedMemory[]> {
    try {
      const entityNames = extractedEntities.map((e) => e.name);
      const prompt = PROMPTS.EXTRACT_MEMORIES(text.slice(0, 8000), entityNames);
      const result = await ai.extractStructured(prompt, memoriesSchema);
      return result.memories.map((m) => ({
        title: m.title,
        description: m.description,
        memoryType: m.memoryType ?? 'experience',
        confidence: m.confidence ?? 0.5,
        attributes: m.attributes ?? {},
        relatedEntities: m.relatedEntities ?? [],
      }));
    } catch (err) {
      console.error('Memory extraction failed:', err);
      return [];
    }
  }

  async extractRelationships(text: string, extractedEntities: ExtractedEntity[]): Promise<ExtractedRelationship[]> {
    try {
      const entityNames = extractedEntities.map((e) => e.name);
      const prompt = PROMPTS.EXTRACT_RELATIONSHIPS(text.slice(0, 8000), entityNames);
      const result = await ai.extractStructured(prompt, relationshipsSchema);
      return result.relationships.map((r) => ({
        source: r.source,
        target: r.target,
        type: r.type ?? 'RELATED_TO',
        description: r.description ?? '',
        confidence: r.confidence ?? 0.5,
      }));
    } catch (err) {
      console.error('Relationship extraction failed:', err);
      return [];
    }
  }

  async resolveEntities(organizationId: string, extractedEntities: ExtractedEntity[]): Promise<ResolvedEntity[]> {
    const resolved: ResolvedEntity[] = [];

    for (const entity of extractedEntities) {
      // Try to find existing entity by name (case-insensitive)
      const existing = await db.query.entities.findFirst({
        where: and(
          eq(entities.organizationId, organizationId),
          ilike(entities.name, entity.name),
        ),
      });

      if (existing) {
        resolved.push({
          ...entity,
          existingId: existing.id,
          isNew: false,
        });
      } else {
        resolved.push({
          ...entity,
          isNew: true,
        });
      }
    }

    return resolved;
  }
}

export const extractor = new KnowledgeExtractor();

export async function extractKnowledge(
  text: string,
  existingEntities: Array<{ name: string; entityType?: string }> = [],
): Promise<{ extraction: Extraction; mode: string }> {
  const entityNames = existingEntities.map((e) => e.name);
  const rawEntities = await extractor.extractEntities(text, entityNames);
  const rawMemories = await extractor.extractMemories(text, rawEntities);
  const rawRelationships = await extractor.extractRelationships(text, rawEntities);

  const allowedEntityTypes = new Set(['person', 'department', 'project', 'customer', 'vendor', 'partner', 'decision', 'process', 'technology', 'document', 'event', 'experience']);
  const allowedMemoryTypes = new Set(['people', 'process', 'decision', 'relationship', 'project', 'experience']);
  const allowedRelTypes = new Set(['WORKS_ON', 'OWNS', 'KNOWS_ABOUT', 'MADE', 'INVOLVES', 'DEPENDS_ON', 'REPORTS_TO', 'RELATED_TO', 'COMMUNICATES_WITH', 'RESULTED_IN', 'REQUIRES', 'REPLACED_BY']);

  const entities = rawEntities.map((e) => ({
    name: e.name.slice(0, 500),
    type: (allowedEntityTypes.has(e.type) ? e.type : 'document') as any,
    description: e.description || '',
    attributes: e.attributes || {},
  }));

  const memories = rawMemories.map((m) => ({
    title: m.title.slice(0, 500),
    description: m.description,
    memoryType: (allowedMemoryTypes.has(m.memoryType) ? m.memoryType : 'experience') as any,
    confidence: m.confidence,
    attributes: m.attributes || {},
    relatedEntities: m.relatedEntities || [],
    excerpt: m.description.slice(0, 3000),
    validFrom: null,
    validUntil: null,
  }));

  const relationships = rawRelationships.map((r) => ({
    source: r.source,
    target: r.target,
    type: (allowedRelTypes.has(r.type) ? r.type : 'RELATED_TO') as any,
    description: r.description || '',
    confidence: r.confidence,
    excerpt: r.description ? r.description.slice(0, 3000) : `${r.source} -> ${r.target}`,
    validFrom: null,
    validUntil: null,
  }));

  const mode = ai.isConfigured ? 'meta' : 'evidence-only';

  return {
    extraction: {
      entities,
      memories,
      relationships,
    },
    mode,
  };
}


