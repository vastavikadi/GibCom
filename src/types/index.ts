// Shared TypeScript types

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MemoryType = 'people' | 'process' | 'decision' | 'relationship' | 'project' | 'experience';
export type VerificationStatus = 'unverified' | 'supported' | 'verified' | 'disputed' | 'superseded';
export type MemoryStatus = 'active' | 'archived' | 'deleted';
export type EntityType = 'person' | 'department' | 'project' | 'customer' | 'vendor' | 'partner' | 'decision' | 'process' | 'technology' | 'document' | 'event' | 'experience';
export type RelationshipType = 'WORKS_ON' | 'OWNS' | 'KNOWS_ABOUT' | 'MADE' | 'INVOLVES' | 'DEPENDS_ON' | 'REPORTS_TO' | 'RELATED_TO' | 'COMMUNICATES_WITH' | 'RESULTED_IN' | 'REQUIRES' | 'REPLACED_BY';

export interface DashboardStats {
  totalMemories: number;
  totalEntities: number;
  totalSources: number;
  totalRelationships: number;
  recentMemories: unknown[];
  pendingVerifications: number;
  knowledgeByType: Record<string, number>;
}

export interface Citation {
  sourceId: string;
  sourceTitle: string;
  excerpt: string;
  relevance: string;
  chunkId?: string;
}

export interface QueryResult {
  answer: string;
  summary: string;
  confidence: number;
  citations: Citation[];
  relatedEntities: Array<{ id: string; name: string; type: string }>;
  followUpQuestions: string[];
  evidenceQuality: string;
  facts: string[];
  assumptions: string[];
  unresolvedQuestions: string[];
}

export interface IntentClassification {
  category: 'organizational' | 'historical' | 'operational' | 'strategic' | 'predictive';
  confidence: number;
  entities: string[];
  timeConstraints?: { before?: string | null; after?: string | null; at?: string | null } | null;
  keywords?: string[];
}

export interface ExtractedEntity {
  name: string;
  type: string;
  description: string;
  attributes: Record<string, unknown>;
}

export interface ExtractedMemory {
  title: string;
  description: string;
  memoryType: string;
  confidence: number;
  attributes: Record<string, unknown>;
  relatedEntities: string[];
}

export interface ExtractedRelationship {
  source: string;
  target: string;
  type: string;
  description: string;
  confidence: number;
}