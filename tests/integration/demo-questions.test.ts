import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect } from 'vitest';
import { intelligence } from '@/lib/engine/intelligence';

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-0001-0001-0001-000000000001'; // Sarah Chen

describe('Canonical 6 Demo Questions (End-to-End)', () => {
  it('Q1: Why did we lose ABC Technologies?', async () => {
    const result = await intelligence.query({
      question: 'Why did we lose ABC Technologies?',
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    expect(result).toBeDefined();
    expect(result.answer).toContain('ABC Technologies');
    expect(result.answer.toLowerCase()).toContain('webhook');
    expect(result.answer).toContain('CompetitorX');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0].sourceTitle).toBeDefined();
  });

  it('Q2: Who knows the most about our payment infrastructure?', async () => {
    const result = await intelligence.query({
      question: 'Who knows the most about our payment infrastructure?',
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    expect(result).toBeDefined();
    expect(result.answer).toContain('David Kim');
    expect(result.answer).toContain('reconciliation');
    expect(result.facts.some((f) => f.includes('David Kim'))).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it('Q3: What decisions shaped our current architecture?', async () => {
    const result = await intelligence.query({
      question: 'What decisions shaped our current architecture?',
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    expect(result).toBeDefined();
    expect(result.answer).toContain('PostgreSQL');
    expect(result.answer).toContain('MongoDB');
    expect(result.answer).toContain('Sarah Chen');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.facts.length).toBeGreaterThan(0);
  });

  it('Q4: What is our current customer onboarding process?', async () => {
    const result = await intelligence.query({
      question: 'What is our current customer onboarding process?',
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    expect(result).toBeDefined();
    expect(result.answer).toContain('5 stages');
    expect(result.answer).toContain('James Wright');
    expect(result.answer).toContain('Data Migration');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.facts.length).toBeGreaterThan(0);
  });

  it('Q5: What happened with GlobalRetail Inc\'s contract?', async () => {
    const result = await intelligence.query({
      question: 'What happened with GlobalRetail Inc\'s contract?',
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    expect(result).toBeDefined();
    expect(result.answer).toContain('GlobalRetail');
    expect(result.answer).toContain('15%');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.facts.length).toBeGreaterThan(0);
  });

  it('Q6: What are our biggest knowledge concentration risks?', async () => {
    const result = await intelligence.query({
      question: 'What are our biggest knowledge concentration risks?',
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    expect(result).toBeDefined();
    expect(result.answer).toContain('David Kim');
    expect(result.answer).toContain('reconciliation');
    expect(result.answer).toContain('Alex Novak');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.facts.length).toBeGreaterThan(0);
  });
});

