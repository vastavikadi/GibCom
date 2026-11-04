import { z } from 'zod';
import { createHash } from 'node:crypto';

export const memoryTypes = ['people', 'process', 'decision', 'relationship', 'project', 'experience'] as const;
export const entityTypes = ['person', 'department', 'project', 'customer', 'vendor', 'partner', 'decision', 'process', 'technology', 'document', 'event', 'experience'] as const;
export const relationshipTypes = ['WORKS_ON', 'OWNS', 'KNOWS_ABOUT', 'MADE', 'INVOLVES', 'DEPENDS_ON', 'REPORTS_TO', 'RELATED_TO', 'COMMUNICATES_WITH', 'RESULTED_IN', 'REQUIRES', 'REPLACED_BY'] as const;
export const roles = ['employee', 'manager', 'admin', 'owner'] as const;
export const confidenceSchema = z.number().finite().min(0).max(1);
export const dateSchema = z.string().datetime({ offset: true });
export const entitySchema = z.object({ name: z.string().trim().min(1).max(500), type: z.enum(entityTypes), description: z.string().max(3000).default(''), attributes: z.record(z.unknown()).default({}) });
export const memorySchema = z.object({
  title: z.string().trim().min(1).max(500), description: z.string().trim().min(1).max(15000),
  memoryType: z.enum(memoryTypes), confidence: confidenceSchema.default(0.5),
  relatedEntities: z.array(z.string().min(1)).max(30).default([]), attributes: z.record(z.unknown()).default({}),
  validFrom: dateSchema.nullable().default(null), validUntil: dateSchema.nullable().default(null),
  excerpt: z.string().min(1).max(15000),
}).refine(m => !m.validFrom || !m.validUntil || Date.parse(m.validFrom) < Date.parse(m.validUntil), 'Validity end must follow start');
export const relationshipSchema = z.object({
  source: z.string().min(1), target: z.string().min(1), type: z.enum(relationshipTypes),
  description: z.string().default(''), confidence: confidenceSchema.default(0.5), excerpt: z.string().min(1),
  validFrom: dateSchema.nullable().default(null), validUntil: dateSchema.nullable().default(null),
}).refine(r => r.source !== r.target, 'Self relationships are not supported');
export const extractionSchema = z.object({ entities: z.array(entitySchema).max(100), memories: z.array(memorySchema).max(100), relationships: z.array(relationshipSchema).max(100) });
export type Extraction = z.infer<typeof extractionSchema>;
export type ProposedMemory = z.infer<typeof memorySchema>;
export interface Actor { userId: string; organizationId: string; role: string }
export function hasRole(actual: string, required: string): boolean { const a = roles.indexOf(actual as typeof roles[number]); const b = roles.indexOf(required as typeof roles[number]); return a >= 0 && b >= 0 && a >= b; }
export function contentHash(content: string | Buffer): string { return createHash('sha256').update(content).digest('hex'); }
export function normalizeName(name: string): string { return name.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' '); }
export function atTime(item: { validFrom?: Date | string | null; validUntil?: Date | string | null }, at: Date): boolean {
  return (!item.validFrom || new Date(item.validFrom) <= at) && (!item.validUntil || new Date(item.validUntil) > at);
}
export function quoteSupported(quote: string, content: string): boolean {
  const normalize = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return quote.trim().length > 0 && normalize(content).includes(normalize(quote));
}
export function inferMemoryType(text: string): typeof memoryTypes[number] {
  if (/decid|rationale|alternative|architecture decision/i.test(text)) return 'decision';
  if (/process|onboard|workflow|step\s*\d/i.test(text)) return 'process';
  if (/expert|knows|maintainer|expertise/i.test(text)) return 'people';
  if (/customer|client|deal|contract/i.test(text)) return 'relationship';
  if (/project|milestone|deadline|owner/i.test(text)) return 'project';
  return 'experience';
}
