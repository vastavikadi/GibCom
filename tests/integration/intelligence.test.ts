import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect } from 'vitest';
import { intelligence } from '@/lib/engine/intelligence';
import { retrieval } from '@/lib/engine/retrieval';

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-0001-0001-0001-000000000001'; // Sarah Chen

describe('Intelligence Engine & Query Pipeline (Integration)', () => {
  it('retrieves relevant knowledge and answers why ABC Technologies was lost', async () => {
    const result = await intelligence.query({
      question: 'Why did we lose ABC Technologies?',
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    expect(result).toBeDefined();
    expect(result.answer).toContain('ABC Technologies');
    expect(result.answer.toLowerCase()).toContain('webhook');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it('answers who has expertise in payment reconciliation', async () => {
    const result = await intelligence.query({
      question: 'Who knows the most about our payment reconciliation system?',
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    expect(result.answer).toContain('David Kim');
    expect(result.answer).toContain('reconciliation');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('retrieves graph and entities in hybrid search', async () => {
    const retrievalResult = await retrieval.hybridRetrieve(ORG_ID, 'Project Atlas PostgreSQL', {
      includeGraph: true,
      includeHistory: true,
    });

    expect(retrievalResult.memories.length).toBeGreaterThan(0);
    expect(retrievalResult.entities.length).toBeGreaterThan(0);
    expect(retrievalResult.chunks.length).toBeGreaterThan(0);
  });
});
