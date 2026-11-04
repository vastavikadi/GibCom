import { describe, it, expect } from 'vitest';
import { deterministicEmbedding } from '@/lib/ai/provider';

describe('Retrieval & Embedding Engine', () => {
  it('generates normalized 1536-dimensional embeddings deterministically', () => {
    const text = 'David Kim is the sole maintainer of payment reconciliation';
    const emb1 = deterministicEmbedding(text);
    const emb2 = deterministicEmbedding(text);

    expect(emb1).toHaveLength(1536);
    expect(emb2).toHaveLength(1536);
    expect(emb1).toEqual(emb2);

    // Verify vector unit magnitude
    let mag = 0;
    for (const v of emb1) mag += v * v;
    expect(Math.sqrt(mag)).toBeCloseTo(1.0, 4);
  });

  it('produces identical vectors for identical text and distinct vectors for different text', () => {
    const text1 = 'David Kim specializes in billing reconciliation';
    const text2 = 'David Kim specializes in billing reconciliation';
    const textDifferent = 'Sarah Chen presented Q2 sales pipeline and marketing plans';

    const v1 = deterministicEmbedding(text1);
    const v2 = deterministicEmbedding(text2);
    const v3 = deterministicEmbedding(textDifferent);

    const cosineSimilarity = (a: number[], b: number[]) => {
      let dot = 0;
      for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
      return dot;
    };

    const simSelf = cosineSimilarity(v1, v2);
    const simDiff = cosineSimilarity(v1, v3);

    expect(simSelf).toBeCloseTo(1.0, 5);
    expect(simDiff).toBeLessThan(simSelf);
  });
});
