import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { actionProposals } from '@/lib/db/schema';
import { ai } from '@/lib/ai';
import { PROMPTS } from '@/lib/ai/prompts';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { logAudit } from '@/lib/permissions/audit';

const actionSchema = z.object({
  actionType: z.string().min(1),
  context: z.string().min(1),
});

export async function GET() {
  try {
    const { organizationId } = await requireAuth();
    const results = await db.query.actionProposals.findMany({
      where: eq(actionProposals.organizationId, organizationId),
      orderBy: [desc(actionProposals.createdAt)],
      limit: 20,
    });
    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ success: false, error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 });
  }
}

function generateActionDraft(actionType: string, context: string) {
  const typeTitles: Record<string, string> = {
    project_handover: `Project Handover: ${context.slice(0, 50)}`,
    meeting_brief: `Meeting Brief: ${context.slice(0, 50)}`,
    customer_report: `Customer Intelligence: ${context.slice(0, 50)}`,
    onboarding_guide: `Onboarding Guide: ${context.slice(0, 50)}`,
    process_doc: `Process Documentation: ${context.slice(0, 50)}`,
    workflow_improvement: `Workflow Improvement Proposal: ${context.slice(0, 50)}`,
  };

  const title = typeTitles[actionType] || `Executive Draft: ${context.slice(0, 50)}`;

  let content = '';
  let steps: string[] = [];

  switch (actionType) {
    case 'project_handover':
      content = `## 1. Executive Summary & Ownership Transition\nThis document transfers operational and architectural leadership for the specified project. It synthesizes institutional memory, current technical status, and active dependencies.\n\n### 2. Context & Objectives\n${context}\n\n### 3. Key Architecture & Repositories\n- **Primary Services:** Production backend microservices, transactional storage, container orchestration.\n- **Critical Dependencies:** API Gateway webhook service, integration pipelines, and event streaming.\n\n### 4. Known Risks & Open Items\n- Critical system components maintain single-point dependencies requiring knowledge transfer.\n- Target delivery milestones require close coordination between Engineering and Product.`;
      steps = [
        'Review current sprint blockers and architectural decision records',
        'Schedule 1-on-1 walkthrough with core service maintainers and technical leads',
        'Transfer service ownership in monitoring, alerting, and on-call dashboards',
        'Confirm formal signoff from department leadership',
      ];
      break;

    case 'meeting_brief':
      content = `## Meeting Brief & Context Briefing\n\n### 1. Objective & Agenda\n${context}\n\n### 2. Stakeholder Background\n- Review past interactions, recorded commitments, and open escalations.\n- Ground all discussion points in verified organizational memories.\n\n### 3. Key Talking Points\n- Current system capabilities and recent milestones.\n- Clear commitments with defined timelines and ownership.\n\n### 4. Desired Outcomes\n- Explicit alignment on next steps and agreed delivery dates.`;
      steps = [
        'Circulate meeting brief to attendees 24 hours prior',
        'Review historical decisions and customer expectations',
        'Document minutes and action items in Brain immediately following meeting',
      ];
      break;

    case 'customer_report':
      content = `## Customer Relationship & History Brief\n\n### 1. Account Summary\n${context}\n\n### 2. Commercial Context & History\n- Track contract value, renewal cycles, and historical SLA performance.\n- Retain all technical requirements (e.g. PCI compliance, sub-200ms transaction times).\n\n### 3. Relationship Health & Escalations\n- Direct communication channels maintained between Account Executives and Customer Success.\n- Praise recorded for technical support responsiveness during migration.\n\n### 4. Strategic Recommendations\n- Ensure feature parity for mobile SDK and real-time dashboard analytics prior to renewal.`;
      steps = [
        'Review historical support ticket resolution metrics',
        'Confirm customer timeline for contract renewal milestones',
        'Share updated roadmap preview for merchant dashboard',
      ];
      break;

    case 'onboarding_guide':
      content = `## Role & Team Onboarding Guide\n\n### 1. Welcome & Orientation\n${context}\n\n### 2. The First 30 Days\n- **Week 1:** Team introductions, architecture overview, sandbox environment setup.\n- **Week 2:** Codebase navigation, first PR review, documentation reading.\n- **Weeks 3–4:** End-to-end task completion with mentor pairing.\n\n### 3. Essential Knowledge & Tooling\n- Git, PostgreSQL, Docker, Kubernetes.\n- Consult Company Brain for architectural decision records and historical rationale.`;
      steps = [
        'Complete account provisioning and Slack channel invites',
        'Pair with team buddy on introductory task',
        'Review architecture overview documentation in Brain',
        'Conduct 30-day check-in with manager',
      ];
      break;

    case 'process_doc':
      content = `## Standard Operating Procedure (SOP)\n\n### 1. Process Overview & Owner\n${context}\n\n### 2. Pre-requisites & Triggers\n- Define explicit entry criteria and necessary permissions.\n\n### 3. Step-by-Step Procedure\n1. Initiate request with required parameters.\n2. Verify compliance and security checklist.\n3. Execute staged deployment or migration.\n4. Validate operational health metrics.\n\n### 4. Escalation Path\n- Escalate P0 blockers immediately to technical leads.`;
      steps = [
        'Verify input data and environment readiness',
        'Execute checklist in accordance with established SLA',
        'Log execution details in audit system',
        'Notify stakeholders upon completion',
      ];
      break;

    default:
      content = `## Strategic Proposal & Workflow Assessment\n\n### 1. Context & Purpose\n${context}\n\n### 2. Current State Analysis\nIdentified bottlenecks, handoff friction, and knowledge silos from team observations.\n\n### 3. Proposed Improvements\n- Automate repetitive handoffs using Company Brain action templates.\n- Establish transparent ownership and SLA tracking.\n\n### 4. Expected Impact\n- Reduced cycle time and improved institutional memory capture.`;
      steps = [
        'Gather feedback from key cross-functional stakeholders',
        'Run pilot implementation for 2 weeks',
        'Measure efficiency metrics and institutionalize policy',
      ];
      break;
  }

  return { title, content, steps };
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireAuth();
    const body = await request.json();
    const data = actionSchema.parse(body);

    let generated: { title: string; content: string; steps?: string[] };

    if (ai.isConfigured) {
      try {
        const prompt = PROMPTS.GENERATE_ACTION(data.actionType, data.context);
        const response = await ai.chat(
          [{ role: 'system', content: 'Return valid JSON with title, content (markdown), and steps (string array).' }, { role: 'user', content: prompt }],
          { jsonMode: true },
        );
        generated = JSON.parse(response.content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
      } catch {
        generated = generateActionDraft(data.actionType, data.context);
      }
    } else {
      generated = generateActionDraft(data.actionType, data.context);
    }

    const proposalId = uuid();
    await db.insert(actionProposals).values({
      id: proposalId,
      organizationId,
      proposedBy: user.id,
      actionType: data.actionType,
      title: generated.title,
      description: data.context,
      proposedExecution: generated,
      approvalStatus: 'pending',
    });

    await logAudit({
      organizationId,
      userId: user.id,
      action: 'action_proposed',
      resourceType: 'action_proposal',
      resourceId: proposalId,
    });

    return NextResponse.json({ success: true, data: { proposalId, generated } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ success: false, error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 });
  }
}
