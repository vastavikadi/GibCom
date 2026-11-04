import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { sources, sourceChunks, memories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { POST as syncConnector } from '@/app/api/sources/sync-connector/route';
import { PATCH as updateMemory } from '@/app/api/memories/[id]/route';

describe('Data Connectors & Memory Governance (Integration)', () => {
  it('syncs a GitHub stream into sources, chunks, embeddings and memories', async () => {
    const req = new Request('http://localhost:3000/api/sources/sync-connector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorType: 'github' }),
    });

    const res = await syncConnector(req as any);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.sourceId).toBeDefined();
    expect(body.data.chunksCount).toBeGreaterThanOrEqual(1);

    // Verify in database
    const createdSource = await db.query.sources.findFirst({
      where: eq(sources.id, body.data.sourceId),
    });
    expect(createdSource).toBeDefined();
    expect(createdSource?.title).toContain('GitHub PR #184');

    const chunks = await db.query.sourceChunks.findMany({
      where: eq(sourceChunks.sourceId, body.data.sourceId),
    });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].content).toContain('real-time transaction notification dispatcher');
  });

  it('allows manager/admin to dispute and then verify a memory with governance reasons', async () => {
    // 1. Find or pick a memory
    const memory = await db.query.memories.findFirst();
    expect(memory).toBeDefined();

    const memId = memory!.id;

    // 2. Mark disputed
    const disputeReq = new Request(`http://localhost:3000/api/memories/${memId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationStatus: 'disputed',
        resolutionReason: 'Contradicted by newer sprint deliverables.',
      }),
    });

    const disputeRes = await updateMemory(disputeReq as any);
    const disputeData = await disputeRes.json();
    expect(disputeData.success).toBe(true);

    const disputedMem = await db.query.memories.findFirst({
      where: eq(memories.id, memId),
    });
    expect(disputedMem?.verificationStatus).toBe('disputed');

    // 3. Mark verified with CTO resolution
    const verifyReq = new Request(`http://localhost:3000/api/memories/${memId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationStatus: 'verified',
        resolutionReason: 'Reviewed and confirmed with engineering leads.',
      }),
    });

    const verifyRes = await updateMemory(verifyReq as any);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);

    const verifiedMem = await db.query.memories.findFirst({
      where: eq(memories.id, memId),
    });
    expect(verifiedMem?.verificationStatus).toBe('verified');
  });
});

