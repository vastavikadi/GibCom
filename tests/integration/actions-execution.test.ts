import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { users, actionProposals, memories, events } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { POST as createAction } from '@/app/api/actions/route';
import { PATCH as updateAction, GET as getAction } from '@/app/api/actions/[id]/route';

const ORG_ID = '11111111-1111-1111-1111-111111111111';

describe('Continuous Learning & Action Execution Loop (Integration)', () => {
  it('creates an action proposal, approves it, and executes it into organizational memory', async () => {
    // 1. Create action proposal
    const createReq = new Request('http://localhost:3000/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'project_handover',
        context: 'Transitioning payment gateway monitoring and alerting ownership to Alex Novak.',
      }),
    });

    const createRes = await createAction(createReq as any);
    const createData = await createRes.json();

    expect(createData.success).toBe(true);
    expect(createData.data.proposalId).toBeDefined();
    const proposalId = createData.data.proposalId;

    // Verify initial proposal status is 'pending'
    const fetched = await db.query.actionProposals.findFirst({
      where: eq(actionProposals.id, proposalId),
    });
    expect(fetched).toBeDefined();
    expect(fetched?.approvalStatus).toBe('pending');

    // 2. Approve proposal
    const approveReq = new Request(`http://localhost:3000/api/actions/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });

    const approveRes = await updateAction(approveReq as any, { params: { id: proposalId } });
    const approveData = await approveRes.json();
    expect(approveData.success).toBe(true);
    expect(approveData.data.approvalStatus).toBe('approved');

    // 3. Execute proposal & trigger feedback loop into organizational memory
    const execReq = new Request(`http://localhost:3000/api/actions/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'execute',
        notes: 'Handover complete. PagerDuty escalation and Slack alerts reassigned.',
      }),
    });

    const execRes = await updateAction(execReq as any, { params: { id: proposalId } });
    const execData = await execRes.json();
    expect(execData.success).toBe(true);
    expect(execData.data.approvalStatus).toBe('executed');
    expect(execData.memoryId).toBeDefined();

    // 4. Verify that structured memory was created in the database
    const createdMemory = await db.query.memories.findFirst({
      where: eq(memories.id, execData.memoryId),
    });
    expect(createdMemory).toBeDefined();
    expect(createdMemory?.organizationId).toBe(ORG_ID);
    expect(createdMemory?.verificationStatus).toBe('verified');
    expect(createdMemory?.memoryType).toBe('process');
    expect(createdMemory?.title).toContain('Executed Action:');

    // 5. Verify timeline milestone event was recorded in events table
    const milestoneEvent = await db.query.events.findFirst({
      where: and(
        eq(events.organizationId, ORG_ID),
        eq(events.eventType, 'milestone')
      ),
      orderBy: (events, { desc }) => [desc(events.createdAt)],
    });
    expect(milestoneEvent).toBeDefined();
    expect(milestoneEvent?.title).toContain('Action Executed:');
  });
});

