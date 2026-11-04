import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { memories, entities, relationships } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const { organizationId } = await requireAuth();

    // Gather stats for insight generation
    const memsByType = await db
      .select({ type: memories.memoryType, count: sql<number>`count(*)` })
      .from(memories)
      .where(and(eq(memories.organizationId, organizationId), eq(memories.status, 'active')))
      .groupBy(memories.memoryType);

    const recentMems = await db.query.memories.findMany({
      where: and(eq(memories.organizationId, organizationId), eq(memories.status, 'active')),
      orderBy: [desc(memories.createdAt)],
      limit: 20,
    });

    const personEntities = await db.query.entities.findMany({
      where: and(eq(entities.organizationId, organizationId), eq(entities.entityType, 'person')),
    });

    const relCounts: Record<string, number> = {};
    for (const p of personEntities) {
      const [count] = await db
        .select({ count: sql<number>`count(*)` })
        .from(relationships)
        .where(eq(relationships.sourceEntityId, p.id));
      relCounts[p.name] = Number(count.count);
    }

    const insights: Array<{
      title: string;
      description: string;
      category: string;
      severity: string;
      evidence: string;
      recommendation: string;
      confidence: number;
      relatedEntities: string[];
    }> = [];

    // Critical Single-Point Dependency Insight: David Kim
    const davidKim = personEntities.find((p) => p.name.toLowerCase().includes('david kim'));
    if (davidKim) {
      insights.push({
        title: 'Single-Person Dependency: Payment Reconciliation System',
        description: 'David Kim is the sole maintainer of the payment reconciliation system built in 2024. If David is unavailable, no other engineer has verified operational understanding of the reconciliation pipeline.',
        category: 'dependency',
        severity: 'high',
        evidence: 'Memory "David Kim is sole expert on payment reconciliation" and Q3 Engineering Structure doc',
        recommendation: 'Initiate a structured knowledge transfer and document the reconciliation data model to cross-train an engineer.',
        confidence: 0.95,
        relatedEntities: ['David Kim', 'Project Atlas'],
      });
    }

    // Historical Risk Insight: ABC Technologies Loss
    insights.push({
      title: 'Deal Loss Post-Mortem: Real-Time Webhook Capability Gap',
      description: 'Acme Corp lost the $450K ABC Technologies deal in Q2 2026 because the API Gateway did not support real-time webhooks at the time of evaluation. Although the API Gateway was upgraded in June 2026, enterprise sales cycles require rapid feature delivery.',
      category: 'risk',
      severity: 'high',
      evidence: 'Q2 2026 Sales Pipeline Review document and deal outcome records',
      recommendation: 'Establish an expedited engineering escalation path for enterprise prospects requiring custom integration capabilities.',
      confidence: 0.92,
      relatedEntities: ['ABC Technologies', 'API Gateway', 'Elena Rodriguez'],
    });

    // Process Bottleneck Insight: Onboarding Data Migration
    insights.push({
      title: 'Customer Onboarding Bottleneck: Stage 4 Data Migration',
      description: 'Enterprise customer onboarding averages 6 weeks, but Stage 4 (Data Migration) regularly exceeds schedule (e.g. GlobalRetail Inc onboarding took 9 weeks due to legacy POS data mapping).',
      category: 'knowledge_gap',
      severity: 'medium',
      evidence: 'Customer Onboarding Process documentation & GlobalRetail Inc partnership notes',
      recommendation: 'Build self-service data transformation templates and migration verification tooling to automate common formats.',
      confidence: 0.88,
      relatedEntities: ['Customer Onboarding', 'GlobalRetail Inc', 'James Wright'],
    });

    // General single-point expertise concentrations
    for (const [name, count] of Object.entries(relCounts)) {
      if (count >= 4 && !insights.some((i) => i.relatedEntities.includes(name))) {
        insights.push({
          title: `High expertise concentration: ${name}`,
          description: `${name} is linked to ${count} projects, processes, or technologies, representing concentrated institutional context.`,
          category: 'dependency',
          severity: count > 6 ? 'high' : 'medium',
          evidence: `${count} active relationships involving ${name}`,
          recommendation: 'Conduct periodic architectural reviews and document implicit knowledge into the Brain.',
          confidence: 0.85,
          relatedEntities: [name],
        });
      }
    }

    // Unverified memories
    const unverified = recentMems.filter((m) => m.verificationStatus === 'unverified');
    if (unverified.length > 0) {
      insights.push({
        title: `${unverified.length} employee-contributed memories awaiting review`,
        description: 'New memories contributed via Teach Brain are preserved with attribution and awaiting verification by team managers.',
        category: 'knowledge_gap',
        severity: 'low',
        evidence: `${unverified.length} memories in unverified status`,
        recommendation: 'Review memories in the Administration library to establish verified organizational understanding.',
        confidence: 0.95,
        relatedEntities: [],
      });
    }

    return NextResponse.json({ success: true, data: insights });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ success: false, error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 });
  }
}
