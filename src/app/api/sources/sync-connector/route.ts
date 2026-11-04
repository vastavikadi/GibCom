import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { sources, sourceChunks, memories, memoryEvidence, entities, relationships } from '@/lib/db/schema';
import { DocumentProcessor } from '@/lib/ingestion/processor';
import { extractKnowledge } from '@/lib/ingestion/extractor';
import { ai } from '@/lib/ai';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/permissions/audit';
import { contentHash } from '@/lib/domain/contracts';

const CONNECTOR_TEMPLATES: Record<
  string,
  {
    title: string;
    sourceType: string;
    content: string;
  }
> = {
  slack: {
    title: 'Slack #architecture-decisions (Q3 2026 Sync)',
    sourceType: 'slack',
    content: `# Slack Sync: #architecture-decisions
Date: August 14, 2026
Channel: #architecture-decisions
Participants: Sarah Chen (CTO), Alex Novak (DevOps), David Kim (Sr Backend)

[10:14 AM] Sarah Chen:
We need to finalize our ingress architecture for the unified API Gateway before the next enterprise cohort begins onboarding. Alex, what did our load tests with Envoy show?

[10:18 AM] Alex Novak:
Envoy handled 45,000 requests/sec with p99 latency under 12ms. We tested mutual TLS (mTLS) termination at the edge, and the overhead was negligible (<2ms).
I recommend we standardize on Envoy as the Kubernetes Ingress Controller for all Project Atlas services.

[10:22 AM] David Kim:
From the payment reconciliation side, that latency profile is crucial. If the gateway can sign webhooks via HMAC-SHA256 within the ingress pipeline without hitting backend workers, our billing reconciliation queue won't see spikes during bulk payouts.

[10:25 AM] Sarah Chen:
Decision approved:
1. Standardize Kubernetes Ingress on Envoy with edge mTLS.
2. Offload HMAC webhook signature verification to the ingress layer.
3. Target rollout across production clusters by September 1, 2026.
Ownership: Alex Novak leads deployment; David Kim validates payment reconciliation hooks.`,
  },
  github: {
    title: 'GitHub PR #184: Real-time Webhook Notification Engine',
    sourceType: 'github',
    content: `# GitHub Pull Request #184
Repository: acme/api-gateway
Title: feat(webhooks): real-time transaction notification dispatcher with HMAC-SHA256
Author: Alex Novak (@alex-devops)
Reviewers: Sarah Chen (@sarah-cto), David Kim (@david-kim)
Merged: June 28, 2026

## Summary
Implements the native real-time webhook notification engine for payment confirmation events. This resolves the technical gap identified during the ABC Technologies post-mortem (where our lack of sub-minute webhooks led to deal loss).

## Key Architectural Decisions & Changes
- Implemented asynchronous webhook dispatcher worker pool using Go channels.
- Retry policy: Exponential backoff with jitter (immediate, 30s, 5m, 30m, 2h).
- Added HMAC-SHA256 signature header (\`X-Acme-Signature\`) to guarantee payload integrity.
- Webhook delivery latency tested at <450ms globally across 10 distributed workers.

## Review Notes
- **Sarah Chen:** "Clean implementation. Confirms requirement for ABC Technologies and future Tier-1 enterprise merchants."
- **David Kim:** "Tested compatibility with payment reconciliation events; verified zero dropped notifications during simulated failover."`,
  },
  jira: {
    title: 'Jira Sprint 44 Retrospective & Onboarding Stage 4 Improvements',
    sourceType: 'jira',
    content: `# Jira Sprint 44 Retrospective
Project: Customer Success & Platform Delivery (CSP)
Sprint: 44 (July 15 - July 29, 2026)
Facilitator: James Wright (Head of CS)
Attendees: Elena Rostova, Priya Patel, David Kim, Lisa Wang

## Goal Review
Sprint Goal: Reduce enterprise onboarding cycle time by resolving the Stage 4 (Data Migration) bottleneck.

## Metrics & Outcomes
- Average enterprise onboarding duration dropped from 6 weeks to 3.5 weeks.
- Developed an automated POS column-mapping parser that converts legacy retail schemas into Acme merchant format automatically.
- GlobalRetail Inc renewal completed smoothly with 15% price increase (\$368K ACV), citing rapid resolution of onboarding tickets.

## Action Items
1. James Wright to publish the updated 3.5-week Onboarding Playbook to Company Brain.
2. David Kim to mentor Lisa Wang on billing transaction schemas to distribute reconciliation expertise.
3. Elena Rostova to include automated POS migration capability in upcoming Q3 enterprise sales collateral.`,
  },
  meetings: {
    title: 'Executive Offsite Transcript: H2 2026 Growth & Governance',
    sourceType: 'meeting',
    content: `# Executive Leadership Offsite Transcript
Date: July 20, 2026
Location: Offsite Conference Room & Virtual
Attendees: Sarah Chen (CTO), Marcus Vance (VP Eng), Elena Rostova (Head of Sales), James Wright (Head of CS)

## 1. H2 Enterprise Sales Strategy & Target Accounts
Elena Rostova presented the pipeline review. With API Gateway webhooks now live and the 3.5-week onboarding turnaround proven with GlobalRetail, sales is targeting three Tier-1 logistics networks for Q4.
Commitment: Pipeline target for Q4 set at \$1.8M new ACV.

## 2. Infrastructure & Single-Person Risk Mitigation
Marcus Vance and Sarah Chen reviewed organizational knowledge concentration risks.
Identified: David Kim remains the sole expert on the legacy 2024 billing reconciliation core.
Resolution:
- Initiated a 4-week knowledge transfer initiative with Lisa Wang and Alex Novak.
- Handover documentation and architectural decision records to be recorded directly in Company Brain.
- Target completion: End of August 2026.

## 3. Compliance & Security Roadmap
Sarah Chen confirmed that SOC2 Type II audit window begins September 15, 2026.
All data isolation policies between customer tenants must maintain explicit row-level enforcement.`,
  },
};

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireAuth();
    const body = await request.json();
    const { connectorType } = body;

    const template = CONNECTOR_TEMPLATES[connectorType];
    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown connector type: "${connectorType}". Supported: slack, github, jira, meetings`,
        },
        { status: 400 }
      );
    }

    const sourceId = uuid();
    const hash = contentHash(organizationId + template.sourceType + template.content);

    // 1. Create source record
    const [newSource] = await db
      .insert(sources)
      .values({
        id: sourceId,
        organizationId,
        title: template.title,
        sourceType: template.sourceType,
        mimeType: 'text/markdown',
        fileSize: Buffer.byteLength(template.content, 'utf-8'),
        content: template.content,
        uploadedBy: user.id,
        accessPolicy: 'organization',
        status: 'completed',
        metadata: {
          connectorType,
          syncedAt: new Date().toISOString(),
          syncedBy: user.email,
          contentHash: hash,
        },
      })
      .returning();

    // 2. Chunk document content
    const processor = new DocumentProcessor();
    const chunks = processor.chunkContent(template.content);

    // 3. Insert chunks with embeddings
    const chunkEmbeddings = await ai.generateEmbeddings(chunks.map((c) => c.content));
    for (let i = 0; i < chunks.length; i++) {
      await db.insert(sourceChunks).values({
        id: uuid(),
        sourceId: newSource.id,
        organizationId,
        chunkIndex: chunks[i].chunkIndex,
        content: chunks[i].content,
        startOffset: chunks[i].startOffset,
        endOffset: chunks[i].endOffset,
        section: chunks[i].section || null,
        metadata: { connectorType },
        embedding: chunkEmbeddings[i] || null,
      });
    }

    // 4. Extract entities & create memories
    const existingEntities = await db.query.entities.findMany({
      where: eq(entities.organizationId, organizationId),
    });
    const known = existingEntities.map((e) => ({ name: e.name, entityType: e.entityType }));

    const knowledge = await extractKnowledge(template.content.slice(0, 10000), known);

    // Persist extracted memories
    const memoriesCreated: string[] = [];
    for (const mem of knowledge.extraction.memories) {
      const memoryId = uuid();
      await db.insert(memories).values({
        id: memoryId,
        organizationId,
        memoryType: mem.memoryType,
        title: mem.title,
        description: mem.description,
        confidence: mem.confidence || 0.85,
        verificationStatus: 'verified',
        status: 'active',
        createdBy: user.id,
        accessPolicy: 'organization',
        validFrom: new Date(),
        attributes: {
          connectorType,
          sourceId: newSource.id,
        },
      });

      // Link evidence
      await db.insert(memoryEvidence).values({
        id: uuid(),
        memoryId,
        sourceId: newSource.id,
        evidenceType: 'supports',
        excerpt: mem.excerpt || template.content.slice(0, 300),
        confidence: 0.9,
      });

      memoriesCreated.push(memoryId);
    }

    // 5. Audit log
    await logAudit({
      organizationId,
      userId: user.id,
      action: 'connector_synced',
      resourceType: 'source',
      resourceId: newSource.id,
      details: {
        connectorType,
        chunksCount: chunks.length,
        memoriesCount: memoriesCreated.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sourceId: newSource.id,
        title: template.title,
        connectorType,
        chunksCount: chunks.length,
        memoriesCreated: memoriesCreated.length,
      },
      message: `Stream "${template.title}" synced and ingested into organizational memory.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to sync connector';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === 'Unauthorized' ? 401 : 500 }
    );
  }
}
