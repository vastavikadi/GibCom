import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { actionProposals, memories, events, entities, relationships } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logAudit } from '@/lib/permissions/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organizationId } = await requireAuth();
    const proposal = await db.query.actionProposals.findFirst({
      where: and(
        eq(actionProposals.id, params.id),
        eq(actionProposals.organizationId, organizationId)
      ),
    });

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Action proposal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: proposal });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch proposal';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, organizationId } = await requireAuth();
    const body = await request.json();
    const { action, notes = '' } = body; // action: 'approve' | 'reject' | 'execute'

    const proposal = await db.query.actionProposals.findFirst({
      where: and(
        eq(actionProposals.id, params.id),
        eq(actionProposals.organizationId, organizationId)
      ),
    });

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Action proposal not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      const [updated] = await db
        .update(actionProposals)
        .set({
          approvalStatus: 'approved',
          approvedBy: user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(actionProposals.id, proposal.id))
        .returning();

      await logAudit({
        organizationId,
        userId: user.id,
        action: 'action_approved',
        resourceType: 'action_proposal',
        resourceId: proposal.id,
        details: { approvedBy: user.email },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Action proposal approved.',
      });
    }

    if (action === 'reject') {
      const [updated] = await db
        .update(actionProposals)
        .set({
          approvalStatus: 'rejected',
          updatedAt: new Date(),
        })
        .where(eq(actionProposals.id, proposal.id))
        .returning();

      await logAudit({
        organizationId,
        userId: user.id,
        action: 'action_rejected',
        resourceType: 'action_proposal',
        resourceId: proposal.id,
        details: { rejectedBy: user.email, notes },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Action proposal rejected.',
      });
    }

    if (action === 'execute') {
      // 1. Determine corresponding memory type
      const memoryTypeMap: Record<string, string> = {
        project_handover: 'process',
        onboarding_guide: 'process',
        process_doc: 'process',
        customer_report: 'relationship',
        meeting_brief: 'experience',
        workflow_improvement: 'decision',
      };
      const memoryType = memoryTypeMap[proposal.actionType] || 'experience';

      // 2. Feed outcome into organizational memory
      const newMemoryId = uuid();
      const executionTitle = `Executed Action: ${proposal.title}`;
      const executionDescription = `Organizational action "${proposal.title}" (${proposal.actionType.replace(/_/g, ' ')}) executed by ${user.name || user.email}.\n\nContext & Objectives:\n${proposal.description || ''}\n\nExecution Notes:\n${notes || 'Agreed procedure executed and institutionalized.'}`;

      await db.insert(memories).values({
        id: newMemoryId,
        organizationId,
        memoryType,
        title: executionTitle,
        description: executionDescription,
        confidence: 0.95,
        verificationStatus: 'verified',
        status: 'active',
        createdBy: user.id,
        accessPolicy: 'organization',
        validFrom: new Date(),
        attributes: {
          actionProposalId: proposal.id,
          actionType: proposal.actionType,
          executedBy: user.id,
          executionNotes: notes,
        },
      });

      // 3. Record timeline event in organizational events
      const eventId = uuid();
      await db.insert(events).values({
        id: eventId,
        organizationId,
        title: `Action Executed: ${proposal.title}`,
        description: `Executed action proposal of type "${proposal.actionType}". Memory created: ${executionTitle}`,
        eventType: 'milestone',
        occurredAt: new Date(),
        metadata: {
          actionProposalId: proposal.id,
          memoryId: newMemoryId,
          executedBy: user.id,
        },
      });

      // 4. Update action proposal to executed
      const executionResult = {
        outcome: 'Executed successfully and fed back into organizational memory.',
        memoryId: newMemoryId,
        eventId,
        executedAt: new Date().toISOString(),
        executedBy: user.email,
        notes,
      };

      const [updated] = await db
        .update(actionProposals)
        .set({
          approvalStatus: 'executed',
          executionStatus: 'completed',
          approvedBy: proposal.approvedBy || user.id,
          approvedAt: proposal.approvedAt || new Date(),
          executionResult,
          updatedAt: new Date(),
        })
        .where(eq(actionProposals.id, proposal.id))
        .returning();

      // 5. Audit log
      await logAudit({
        organizationId,
        userId: user.id,
        action: 'action_executed',
        resourceType: 'action_proposal',
        resourceId: proposal.id,
        details: {
          memoryId: newMemoryId,
          eventId,
          actionType: proposal.actionType,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        memoryId: newMemoryId,
        message: 'Action executed successfully and fed back into organizational memory.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Supported: approve, reject, execute' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update action';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === 'Unauthorized' ? 401 : 500 }
    );
  }
}
