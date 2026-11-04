import { db } from "@/lib/db";
import {
  sourceChunks,
  memories,
  entities,
  relationships,
  sources,
  memoryEvidence,
  events,
} from "@/lib/db/schema";
import { ai } from "@/lib/ai";
import { eq, and, sql, desc, gte, lte, ilike, or } from "drizzle-orm";

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  memoryTypes?: string[];
  entityTypes?: string[];
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  sourceId?: string;
  sourceTitle?: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalOptions extends SearchOptions {
  includeGraph?: boolean;
  includeHistory?: boolean;
  timeConstraint?: TimeConstraint;
  userId?: string;
}

export interface TimeConstraint {
  before?: Date;
  after?: Date;
  at?: Date;
}

export interface RetrievalResult {
  chunks: SearchResult[];
  memories: Array<{
    id: string;
    title: string;
    description: string;
    memoryType: string;
    confidence: number;
    verificationStatus: string;
    validFrom?: Date | null;
    validUntil?: Date | null;
    score: number;
    sourceTitle?: string;
  }>;
  entities: Array<{
    id: string;
    name: string;
    type: string;
    description?: string | null;
    attributes?: unknown;
  }>;
  relationships: Array<{
    id: string;
    type: string;
    sourceName: string;
    targetName: string;
    confidence: number;
    attributes?: unknown;
  }>;
  timeline?: Array<{
    date: Date;
    title: string;
    description?: string | null;
    type?: string | null;
  }>;
}

export class RetrievalEngine {
  async semanticSearch(
    organizationId: string,
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult[]> {
    const limit = options?.limit || 10;
    const queryEmbedding = await ai.generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Use pgvector cosine distance operator <=>
    const results = await db.execute(sql`
      SELECT sc.id, sc.content, sc.source_id,
        1 - (sc.embedding <=> ${embeddingStr}::vector) as score,
        s.title as source_title
      FROM source_chunks sc
      LEFT JOIN sources s ON sc.source_id = s.id
      WHERE sc.organization_id = ${organizationId}
        AND sc.embedding IS NOT NULL
      ORDER BY sc.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `);

    return (results as unknown as any[]).map((r: any) => ({
      id: r.id,
      content: r.content,
      score: parseFloat(r.score) || 0,
      sourceId: r.source_id,
      sourceTitle: r.source_title,
    }));
  }

  async keywordSearch(
    organizationId: string,
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult[]> {
    const limit = options?.limit || 10;
    const searchTerms = query
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .join(" & ");

    if (!searchTerms) return [];

    const results = await db.execute(sql`
      SELECT sc.id, sc.content, sc.source_id,
        ts_rank(to_tsvector('english', sc.content), to_tsquery('english', ${searchTerms})) as score,
        s.title as source_title
      FROM source_chunks sc
      LEFT JOIN sources s ON sc.source_id = s.id
      WHERE sc.organization_id = ${organizationId}
        AND to_tsvector('english', sc.content) @@ to_tsquery('english', ${searchTerms})
      ORDER BY score DESC
      LIMIT ${limit}
    `);

    return (results as unknown as any[]).map((r: any) => ({
      id: r.id,
      content: r.content,
      score: parseFloat(r.score) || 0,
      sourceId: r.source_id,
      sourceTitle: r.source_title,
    }));
  }

  async graphTraversal(
    organizationId: string,
    entityIds: string[],
    depth: number = 2,
  ) {
    const relatedEntities: Map<
      string,
      { id: string; name: string; type: string; description?: string | null }
    > = new Map();
    const relatedRelationships: Array<{
      id: string;
      type: string;
      sourceName: string;
      targetName: string;
      confidence: number;
      attributes?: unknown;
    }> = [];

    let currentIds = entityIds;

    for (let d = 0; d < depth; d++) {
      if (currentIds.length === 0) break;

      for (const entityId of currentIds) {
        const rels = await db.query.relationships.findMany({
          where: and(
            eq(relationships.organizationId, organizationId),
            or(
              eq(relationships.sourceEntityId, entityId),
              eq(relationships.targetEntityId, entityId),
            ),
          ),
          with: {
            sourceEntity: true,
            targetEntity: true,
          },
        });

        for (const rel of rels) {
          if (!relatedEntities.has(rel.sourceEntity.id)) {
            relatedEntities.set(rel.sourceEntity.id, {
              id: rel.sourceEntity.id,
              name: rel.sourceEntity.name,
              type: rel.sourceEntity.entityType,
              description: rel.sourceEntity.description,
            });
          }
          if (!relatedEntities.has(rel.targetEntity.id)) {
            relatedEntities.set(rel.targetEntity.id, {
              id: rel.targetEntity.id,
              name: rel.targetEntity.name,
              type: rel.targetEntity.entityType,
              description: rel.targetEntity.description,
            });
          }

          relatedRelationships.push({
            id: rel.id,
            type: rel.relationshipType,
            sourceName: rel.sourceEntity.name,
            targetName: rel.targetEntity.name,
            confidence: rel.confidence || 0.5,
            attributes: rel.attributes,
          });
        }
      }

      currentIds = Array.from(relatedEntities.keys()).filter(
        (id) => !entityIds.includes(id),
      );
      entityIds = [...entityIds, ...currentIds];
    }

    return {
      entities: Array.from(relatedEntities.values()),
      relationships: relatedRelationships,
    };
  }

  async memorySearch(
    organizationId: string,
    query: string,
    options?: { memoryTypes?: string[]; limit?: number },
  ): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      memoryType: string;
      confidence: number;
      verificationStatus: string;
      validFrom?: Date | null;
      validUntil?: Date | null;
      score: number;
      sourceTitle?: string;
    }>
  > {
    const limit = options?.limit || 10;
    const queryEmbedding = await ai.generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Build optional memory type filter
    const typeFilter = options?.memoryTypes?.length
      ? sql`AND m.memory_type = ANY(${options.memoryTypes})`
      : sql``;

    const results = await db.execute(sql`
      SELECT m.id, m.title, m.description, m.memory_type, m.confidence,
        m.verification_status, m.valid_from, m.valid_until,
        1 - (m.embedding <=> ${embeddingStr}::vector) as score
      FROM memories m
      WHERE m.organization_id = ${organizationId}
        AND m.status = 'active'
        AND m.embedding IS NOT NULL
        ${typeFilter}
      ORDER BY m.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `);

    return (results as unknown as any[]).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      memoryType: r.memory_type,
      confidence: parseFloat(r.confidence) || 0.5,
      verificationStatus: r.verification_status || "unverified",
      validFrom: r.valid_from ? new Date(r.valid_from) : null,
      validUntil: r.valid_until ? new Date(r.valid_until) : null,
      score: parseFloat(r.score) || 0,
    }));
  }

  async hybridRetrieve(
    organizationId: string,
    query: string,
    options?: RetrievalOptions,
  ): Promise<RetrievalResult> {
    // 1. Semantic search on chunks
    const semanticResults = await this.semanticSearch(organizationId, query, {
      limit: options?.limit || 8,
    });

    // 2. Keyword search on chunks
    const keywordResults = await this.keywordSearch(organizationId, query, {
      limit: options?.limit || 5,
    });

    // 3. Deduplicate and merge chunks
    const seen = new Set<string>();
    const mergedChunks: SearchResult[] = [];
    for (const r of [...semanticResults, ...keywordResults]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        mergedChunks.push(r);
      }
    }
    mergedChunks.sort((a, b) => b.score - a.score);

    // 4. Memory search
    const memoryResults = await this.memorySearch(organizationId, query, {
      memoryTypes: options?.memoryTypes,
      limit: options?.limit || 10,
    });

    // 5. Find mentioned entities
    const entityResults = await this.findEntitiesByQuery(organizationId, query);

    // 6. Graph traversal if requested and entities found
    let graphEntities: RetrievalResult["entities"] = entityResults;
    let graphRelationships: RetrievalResult["relationships"] = [];

    if (options?.includeGraph && entityResults.length > 0) {
      const graph = await this.graphTraversal(
        organizationId,
        entityResults.map((e) => e.id),
        2,
      );
      graphEntities = [
        ...entityResults,
        ...graph.entities.filter(
          (e) => !entityResults.find((er) => er.id === e.id),
        ),
      ];
      graphRelationships = graph.relationships;
    }

    // 7. Timeline if requested
    let timeline: RetrievalResult["timeline"] = undefined;
    if (options?.includeHistory) {
      const entityIds = graphEntities.map((e) => e.id);
      timeline = await this.getTimeline(
        organizationId,
        entityIds,
        options.timeConstraint,
      );
    }

    return {
      chunks: mergedChunks.slice(0, 15),
      memories: memoryResults,
      entities: graphEntities,
      relationships: graphRelationships,
      timeline,
    };
  }

  async temporalRetrieve(
    organizationId: string,
    query: string,
    timeConstraint: TimeConstraint,
  ): Promise<RetrievalResult> {
    return this.hybridRetrieve(organizationId, query, {
      includeGraph: true,
      includeHistory: true,
      timeConstraint,
    });
  }

  private async findEntitiesByQuery(organizationId: string, query: string) {
    const words = query.split(/\s+/).filter((w) => w.length > 2);
    const results: Array<{
      id: string;
      name: string;
      type: string;
      description?: string | null;
      attributes?: unknown;
    }> = [];

    for (const word of words) {
      const found = await db.query.entities.findMany({
        where: and(
          eq(entities.organizationId, organizationId),
          ilike(entities.name, `%${word}%`),
        ),
        limit: 5,
      });
      for (const e of found) {
        if (!results.find((r) => r.id === e.id)) {
          results.push({
            id: e.id,
            name: e.name,
            type: e.entityType,
            description: e.description,
            attributes: e.attributes,
          });
        }
      }
    }

    return results;
  }

  private async getTimeline(
    organizationId: string,
    entityIds: string[],
    timeConstraint?: TimeConstraint,
  ): Promise<
    Array<{
      date: Date;
      title: string;
      description?: string | null;
      type?: string | null;
    }>
  > {
    if (entityIds.length === 0) return [];

    const conditions = [eq(events.organizationId, organizationId)];

    if (timeConstraint?.after)
      conditions.push(gte(events.occurredAt, timeConstraint.after));
    if (timeConstraint?.before)
      conditions.push(lte(events.occurredAt, timeConstraint.before));

    const results = await db.query.events.findMany({
      where: and(...conditions),
      orderBy: [desc(events.occurredAt)],
      limit: 20,
    });

    return results.map((e) => ({
      date: e.occurredAt,
      title: e.title,
      description: e.description,
      type: e.eventType,
    }));
  }
}

export const retrieval = new RetrievalEngine();

export async function retrieve(organizationId: string, query: string, options?: RetrievalOptions) {
  return retrieval.hybridRetrieve(organizationId, query, options);
}

