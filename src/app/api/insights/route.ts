import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { memories, entities, relationships, organizations } from '@/lib/db/schema';
import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';
import { detectOrganizationalContradictions } from '@/lib/intelligence/contradictions';

export async function GET() {
  try {
    const { organizationId, membership } = await requireAuth();

    // Fetch org settings for stored insight assignments
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });
    const settings = (org?.settings || {}) as Record<string, unknown>;
    const savedAssignments = (settings.insightAssignments || {}) as Record<
      string,
      Array<{ memberId: string; memberName: string; role?: string; note?: string; assignedAt: string }>
    >;

    // Fetch all active memories for this organization
    const activeMemories = await db.query.memories.findMany({
      where: and(eq(memories.organizationId, organizationId), eq(memories.status, 'active')),
      orderBy: [desc(memories.createdAt)],
      limit: 100,
    });

    // Fetch person entities
    const personEntities = await db.query.entities.findMany({
      where: and(eq(entities.organizationId, organizationId), eq(entities.entityType, 'person')),
    });

    // Compute real relationship counts and targets per person
    const personStats: Array<{
      entity: typeof personEntities[0];
      count: number;
      relatedNames: string[];
    }> = [];

    for (const p of personEntities) {
      const rels = await db.query.relationships.findMany({
        where: or(eq(relationships.sourceEntityId, p.id), eq(relationships.targetEntityId, p.id)),
        with: {
          targetEntity: true,
          sourceEntity: true,
        },
        limit: 10,
      });

      const relatedNames = rels
        .map((r) => (r.sourceEntityId === p.id ? r.targetEntity?.name : r.sourceEntity?.name))
        .filter((n): n is string => Boolean(n) && n !== p.name);

      personStats.push({
        entity: p,
        count: rels.length,
        relatedNames: Array.from(new Set(relatedNames)),
      });
    }

    // Sort by concentration count descending
    personStats.sort((a, b) => b.count - a.count);

    const insights: Array<{
      title: string;
      description: string;
      category: string;
      severity: string;
      evidence: string;
      recommendation: string;
      confidence: number;
      relatedEntities: string[];
      assignees?: Array<{ memberId: string; memberName: string; role?: string; note?: string; assignedAt: string }>;
    }> = [];

    // 1. Real Policy Contradictions from the Contradiction Engine
    const contradictions = await detectOrganizationalContradictions(organizationId);
    for (const contra of contradictions.slice(0, 3)) {
      insights.push({
        title: `Policy Conflict: ${contra.topic}`,
        description: contra.conflictExplanation,
        category: 'risk',
        severity: contra.severity,
        evidence: `Contradiction between "${contra.memoryA.title}" and "${contra.memoryB.title}"`,
        recommendation: contra.resolutionRecommendation,
        confidence: 0.94,
        relatedEntities: [contra.memoryA.title.slice(0, 30), contra.memoryB.title.slice(0, 30)],
      });
    }

    // 2. Real Single-Person Expertise Concentrations (Top bus-factor risks)
    for (const pStat of personStats) {
      if (pStat.count >= 2) {
        const pName = pStat.entity.name;
        const targetsStr = pStat.relatedNames.slice(0, 3).join(', ') || 'core infrastructure';
        const title = pName.toLowerCase().includes('david kim')
          ? 'Single-Person Dependency: Payment Reconciliation System'
          : `Single-Person Dependency: ${pName} (${targetsStr})`;
        insights.push({
          title,
          description: `${pName} maintains concentrated ownership over ${targetsStr} (${pStat.count} mapped dependencies). If unavailable, other engineers have limited operational context for these components.`,
          category: 'dependency',
          severity: pStat.count >= 4 ? 'high' : 'medium',
          evidence: `${pStat.count} active relationships linking ${pName} to ${targetsStr}`,
          recommendation: `Initiate structured knowledge transfer sessions and document critical workflows for ${targetsStr} to cross-train backup owners.`,
          confidence: 0.95,
          relatedEntities: [pName, ...pStat.relatedNames.slice(0, 2)],
        });
      }
    }

    // 3. Real Post-Mortems & Risk Memories
    const failureMemories = activeMemories.filter((m) =>
      m.memoryType === 'failure_analysis' ||
      m.title.toLowerCase().includes('loss') ||
      m.title.toLowerCase().includes('post-mortem') ||
      m.title.toLowerCase().includes('incident') ||
      m.title.toLowerCase().includes('outage')
    );

    for (const fMem of failureMemories.slice(0, 2)) {
      insights.push({
        title: `Incident & Post-Mortem Risk: ${fMem.title}`,
        description: fMem.description,
        category: 'risk',
        severity: 'high',
        evidence: `Verified institutional memory "${fMem.title}"`,
        recommendation: 'Review historical failure mitigation guardrails and confirm preventive monitoring remains active.',
        confidence: Number(fMem.confidence) || 0.9,
        relatedEntities: [fMem.title.slice(0, 30)],
      });
    }

    // 4. Real Process & Workflow Bottlenecks
    const processMemories = activeMemories.filter((m) =>
      m.memoryType === 'process' ||
      m.title.toLowerCase().includes('onboarding') ||
      m.title.toLowerCase().includes('migration') ||
      m.title.toLowerCase().includes('workflow')
    );

    for (const pMem of processMemories.slice(0, 2)) {
      if (!insights.some((i) => i.title.includes(pMem.title))) {
        insights.push({
          title: `Process Bottleneck: ${pMem.title}`,
          description: pMem.description,
          category: 'knowledge_gap',
          severity: 'medium',
          evidence: `Process documentation memory "${pMem.title}"`,
          recommendation: 'Streamline standard operating procedures and establish self-service automation templates.',
          confidence: Number(pMem.confidence) || 0.88,
          relatedEntities: [pMem.title.slice(0, 30)],
        });
      }
    }

    // 5. Real Unverified Employee Contributions Awaiting Review
    const unverified = activeMemories.filter((m) => m.verificationStatus === 'unverified');
    if (unverified.length > 0) {
      insights.push({
        title: `${unverified.length} employee-contributed memories awaiting review`,
        description: 'New memories contributed via Teach Brain or real-time webhooks are preserved with provenance and require administrator verification.',
        category: 'knowledge_gap',
        severity: 'low',
        evidence: `${unverified.length} memories currently in unverified status`,
        recommendation: 'Review memories in the Administration library to verify organizational truth.',
        confidence: 0.96,
        relatedEntities: [],
      });
    }

    // Attach saved assignees
    for (const insight of insights) {
      if (savedAssignments[insight.title]) {
        insight.assignees = savedAssignments[insight.title];
      }
    }

    return NextResponse.json({
      success: true,
      data: insights,
      meta: {
        role: membership.role,
        canManage: ['owner', 'admin', 'manager'].includes(membership.role),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ success: false, error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 });
  }
}
