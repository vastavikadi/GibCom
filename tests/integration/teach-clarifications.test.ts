import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { memories, sources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { POST as postTeach } from '@/app/api/brain/teach/route';

describe('Teach Brain Clarifying Questions & High Impact Routing (Integration)', () => {
  it('detects ambiguous entity references and high impact architectural decisions in preview', async () => {
    const previewReq = new Request('http://localhost:3000/api/brain/teach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'preview',
        input: 'We discussed with Sarah and agreed to migrate our database to PostgreSQL for strict ACID guarantees.',
        memoryType: 'decision',
      }),
    });

    const res = await postTeach(previewReq as any);
    const body = await res.json();
    expect(body.success).toBe(true);
    const data = body.data;

    expect(data.proposal).toBeDefined();
    expect(data.clarifyingQuestions).toBeDefined();
    expect(data.clarifyingQuestions.length).toBeGreaterThanOrEqual(1);

    // Verify entity ambiguity question was generated for 'Sarah'
    const hasSarahQuestion = data.clarifyingQuestions.some((q: { question: string }) =>
      q.question.includes('Sarah Chen')
    );
    expect(hasSarahQuestion).toBe(true);

    // Verify high impact flag was detected
    expect(data.highImpact).toBe(true);
  });

  it('saves clarified knowledge and links clarifications to the memory description', async () => {
    const confirmReq = new Request('http://localhost:3000/api/brain/teach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'confirm',
        input: 'Agreed on 3-week payment reconciliation audit schedule with David.',
        memoryType: 'process',
        proposal: {
          title: 'Payment Reconciliation 3-Week Audit Cycle',
          description: 'Team will conduct reconciliation reviews every 3 weeks.',
          memoryType: 'process',
          confidence: 0.85,
          relatedEntities: ['Payment Reconciliation System'],
          attributes: {},
          validFrom: null,
          validUntil: null,
          excerpt: 'Agreed on 3-week payment reconciliation audit schedule with David.',
        },
        clarifications: {
          entity_David_Kim: 'Yes, David Kim',
          process_owner: 'David Kim (Sr Backend)',
        },
        accessPolicy: 'organization',
      }),
    });

    const res = await postTeach(confirmReq as any);
    const body = await res.json();
    expect(body.success).toBe(true);
    const data = body.data;

    expect(data.sourceId).toBeDefined();

    // Verify in database
    const createdSource = await db.query.sources.findFirst({
      where: eq(sources.id, data.sourceId),
    });
    expect(createdSource).toBeDefined();
    expect(createdSource?.content).toContain('Clarifications provided during capture:');
    expect(createdSource?.content).toContain('David Kim');
  });
});
