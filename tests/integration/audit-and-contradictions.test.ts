import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { auditLogs, memories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { GET as getAuditLogs } from '@/app/api/audit-logs/route';
import { GET as getContradictions } from '@/app/api/contradictions/route';
import { PATCH as updateMemory } from '@/app/api/memories/[id]/route';
import { v4 as uuid } from 'uuid';

const ORG_ID = '11111111-1111-1111-1111-111111111111';

describe('Audit Logs & Contradiction Intelligence (Integration)', () => {
  it('retrieves immutable organizational audit logs with actor and payload details', async () => {
    // 1. Insert a test audit log entry directly to ensure at least one exists
    await db.insert(auditLogs).values({
      id: uuid(),
      organizationId: ORG_ID,
      action: 'live_connector_synced',
      resourceType: 'source',
      details: { connector: 'github', items: 15, testRun: true },
      createdAt: new Date(),
    });

    // 2. Query GET /api/audit-logs
    const req = new Request('http://localhost:3000/api/audit-logs?limit=25');
    const res = await getAuditLogs(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const first = body.data[0];
    expect(first.action).toBeDefined();
    expect(first.createdAt).toBeDefined();
    expect(first.user).toBeDefined();
  });

  it('filters audit logs by action type', async () => {
    const req = new Request('http://localhost:3000/api/audit-logs?action=live_connector_synced');
    const res = await getAuditLogs(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    for (const item of body.data) {
      expect(item.action).toBe('live_connector_synced');
    }
  });

  it('detects organizational contradictions between conflicting memories', async () => {
    // 1. Create a pair of conflicting memories (e.g. strict discount limit vs high discount approved)
    const memIdA = uuid();
    const memIdB = uuid();

    await db.insert(memories).values([
      {
        id: memIdA,
        organizationId: ORG_ID,
        title: 'Enterprise Discount Policy 2024',
        description: 'Strict governance policy: We reject discount requests exceeding 10% for all enterprise deals.',
        memoryType: 'decision',
        confidence: 0.95,
        verificationStatus: 'verified',
        status: 'active',
        validFrom: new Date('2024-01-01'),
      },
      {
        id: memIdB,
        organizationId: ORG_ID,
        title: 'MegaCorp Expansion Exception',
        description: 'Executive agreement: Approved discount of 25% for MegaCorp 3-year contract renewal.',
        memoryType: 'decision',
        confidence: 0.92,
        verificationStatus: 'verified',
        status: 'active',
        validFrom: new Date('2025-06-01'),
      },
    ]);

    // 2. Call GET /api/contradictions
    const req = new Request('http://localhost:3000/api/contradictions');
    const res = await getContradictions(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const match = body.data.find(
      (c: any) =>
        (c.memoryA.id === memIdA && c.memoryB.id === memIdB) ||
        (c.memoryA.id === memIdB && c.memoryB.id === memIdA)
    );
    expect(match).toBeDefined();
    expect(match.topic).toContain('Discount');
    expect(match.severity).toBe('high');
    expect(match.conflictExplanation).toBeDefined();
    expect(match.resolutionRecommendation).toBeDefined();

    // 3. Resolve contradiction by marking the older policy as superseded
    const patchReq = new Request(`http://localhost:3000/api/memories/${memIdA}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationStatus: 'superseded',
        resolutionReason: 'Superseded by 2025 enterprise expansion guidelines',
      }),
    });
    const patchRes = await updateMemory(patchReq as any, { params: { id: memIdA } });
    const patchBody = await patchRes.json();
    expect(patchBody.success).toBe(true);

    // Verify memory in db is now superseded
    const updatedA = await db.query.memories.findFirst({
      where: eq(memories.id, memIdA),
    });
    expect(updatedA?.verificationStatus).toBe('superseded');
  });
});

