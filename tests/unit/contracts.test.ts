import { describe, it, expect } from 'vitest';
import {
  hasRole,
  contentHash,
  normalizeName,
  atTime,
  memorySchema,
  entitySchema,
  relationshipSchema,
  memoryTypes,
  entityTypes,
  relationshipTypes,
} from '@/lib/domain/contracts';

describe('Contracts & Domain Logic', () => {
  it('enforces correct role hierarchy', () => {
    expect(hasRole('owner', 'admin')).toBe(true);
    expect(hasRole('admin', 'manager')).toBe(true);
    expect(hasRole('manager', 'employee')).toBe(true);
    expect(hasRole('employee', 'owner')).toBe(false);
    expect(hasRole('employee', 'manager')).toBe(false);
  });

  it('normalizes names consistently across unicode and case', () => {
    expect(normalizeName('  David   Kim  ')).toBe('david kim');
    expect(normalizeName('SARAH CHEN')).toBe('sarah chen');
    expect(normalizeName('Project   Atlas ')).toBe('project atlas');
  });

  it('generates consistent SHA256 content hashes', () => {
    const hash1 = contentHash('Test content');
    const hash2 = contentHash('Test content');
    const hash3 = contentHash('Different content');
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toHaveLength(64);
  });

  it('evaluates temporal valid-time window accurately', () => {
    const past = new Date('2026-01-01T00:00:00Z');
    const present = new Date('2026-06-01T00:00:00Z');
    const future = new Date('2026-12-31T00:00:00Z');

    // Currently active item
    expect(atTime({ validFrom: past, validUntil: future }, present)).toBe(true);
    // Expired item
    expect(atTime({ validFrom: past, validUntil: present }, future)).toBe(false);
    // Future item
    expect(atTime({ validFrom: future, validUntil: null }, present)).toBe(false);
    // Open-ended past item
    expect(atTime({ validFrom: past, validUntil: null }, present)).toBe(true);
  });

  it('validates memory schema attributes', () => {
    const valid = memorySchema.safeParse({
      title: 'PostgreSQL ACID Decision',
      description: 'Chose PostgreSQL for transactional consistency in payment engine',
      memoryType: 'decision',
      confidence: 0.95,
      relatedEntities: ['Sarah Chen', 'Project Atlas'],
      attributes: { db: 'postgresql' },
      validFrom: '2026-01-15T00:00:00.000Z',
      validUntil: null,
      excerpt: 'Payment processing requires strong transactional guarantees',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects self-referential relationships', () => {
    const invalid = relationshipSchema.safeParse({
      source: 'Project Atlas',
      target: 'Project Atlas',
      type: 'DEPENDS_ON',
      description: 'Self dependency',
      confidence: 0.8,
      excerpt: 'Dependency',
      validFrom: null,
      validUntil: null,
    });
    expect(invalid.success).toBe(false);
  });
});

