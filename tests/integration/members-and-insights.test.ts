import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { users, organizations, memberships } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { GET as getMembers, POST as postMember } from '@/app/api/members/route';
import { GET as getInsights } from '@/app/api/insights/route';
import { POST as assignInsight, DELETE as unassignInsight } from '@/app/api/insights/assign/route';

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const OWNER_EMAIL = 'sarah@acmecorp.com';

describe('Organization Members & Insights Collaboration (Integration)', () => {
  it('loads all organization members for insights collaboration', async () => {
    const res = await getMembers();
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(8);
    expect(data.data.some((m: { name: string }) => m.name === 'David Kim')).toBe(true);
    expect(data.data.some((m: { name: string }) => m.name === 'Sarah Chen')).toBe(true);
  });

  it('allows owner to add/invite a member to the organization for insights', async () => {
    const uniqueEmail = `test.collaborator.${Date.now()}@acmecorp.com`;
    const req = new Request('http://localhost:3000/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Miller',
        email: uniqueEmail,
        role: 'manager',
        department: 'Risk & Strategy',
        expertise: ['reconciliation', 'vendor-relations'],
      }),
    });

    const res = await postMember(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Jordan Miller');
    expect(data.data.role).toBe('manager');

    // Verify in database
    const createdUser = await db.query.users.findFirst({
      where: eq(users.email, uniqueEmail),
    });
    expect(createdUser).toBeDefined();
    expect(createdUser?.name).toBe('Jordan Miller');
  });

  it('assigns an organization member to a critical insight and verifies it in GET /api/insights', async () => {
    // 1. Get David Kim's user ID
    const david = await db.query.users.findFirst({
      where: eq(users.name, 'David Kim'),
    });
    expect(david).toBeDefined();

    const targetTitle = 'Single-Person Dependency: Payment Reconciliation System';

    // 2. Assign David Kim to this insight
    const assignReq = new Request('http://localhost:3000/api/insights/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insightTitle: targetTitle,
        memberId: david!.id,
        note: 'Lead knowledge transfer and document billing reconciliation pipeline.',
      }),
    });

    const assignRes = await assignInsight(assignReq);
    const assignData = await assignRes.json();
    expect(assignData.success).toBe(true);
    expect(assignData.data.assignees.some((a: { memberId: string }) => a.memberId === david!.id)).toBe(true);

    // 3. Verify GET /api/insights now contains the assigned member
    const insightsRes = await getInsights();
    const insightsData = await insightsRes.json();
    expect(insightsData.success).toBe(true);

    const singlePersonInsight = insightsData.data.find((i: { title: string }) => i.title === targetTitle);
    expect(singlePersonInsight).toBeDefined();
    expect(singlePersonInsight.assignees).toBeDefined();
    expect(singlePersonInsight.assignees.some((a: { memberName: string }) => a.memberName === 'David Kim')).toBe(true);

    // 4. Clean up / Unassign
    const unassignReq = new Request('http://localhost:3000/api/insights/assign', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insightTitle: targetTitle,
        memberId: david!.id,
      }),
    });
    const unassignRes = await unassignInsight(unassignReq);
    const unassignData = await unassignRes.json();
    expect(unassignData.success).toBe(true);
  });
});

