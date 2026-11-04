import { db } from '@/lib/db';
import { memories, organizations } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { ai } from '@/lib/ai';

export interface Contradiction {
  id: string;
  topic: string;
  severity: 'high' | 'medium' | 'low';
  memoryA: {
    id: string;
    title: string;
    description: string;
    memoryType: string;
    confidence: number | null;
    verificationStatus: string | null;
    createdAt: Date | null;
  };
  memoryB: {
    id: string;
    title: string;
    description: string;
    memoryType: string;
    confidence: number | null;
    verificationStatus: string | null;
    createdAt: Date | null;
  };
  conflictExplanation: string;
  resolutionRecommendation: string;
}

// Built-in rule-based semantic contradiction patterns for institutional governance
const CONTRADICTION_PATTERNS = [
  {
    topic: 'Discount & Pricing Governance',
    severity: 'high' as const,
    detect: (mA: string, mB: string) =>
      ((/reject.*discount|no.*discount|cap.*discount.*10%/i.test(mA) && /approv.*discount.*(?:15|20|25|30|35)%/i.test(mB)) ||
       (/reject.*discount|no.*discount|cap.*discount.*10%/i.test(mB) && /approv.*discount.*(?:15|20|25|30|35)%/i.test(mA))),
    explanation:
      'One record enforces strict discount limits or rejection, while another documents an approved high-percentage discount exception without cross-referencing policy.',
    recommendation:
      'Mark the earlier policy as superseded or verify the exception memory with a formal management discount waiver reference.',
  },
  {
    topic: 'Database & Infrastructure Standard',
    severity: 'high' as const,
    detect: (mA: string, mB: string) =>
      ((/postgres.*(?:only|standard|single source)|prohibit.*nosql/i.test(mA) && /adopt.*(?:mongo|dynamo|nosql)|migrate.*nosql/i.test(mB)) ||
       (/postgres.*(?:only|standard|single source)|prohibit.*nosql/i.test(mB) && /adopt.*(?:mongo|dynamo|nosql)|migrate.*nosql/i.test(mA))),
    explanation:
      'Conflicting architectural standards: one memory mandates PostgreSQL as the sole source of truth, while another records adoption of a NoSQL database.',
    recommendation:
      'Clarify architectural boundary (e.g. relational core vs caching/document tier) and update the policy memory to reflect explicit multi-model boundaries.',
  },
  {
    topic: 'Security & Authentication Policy',
    severity: 'high' as const,
    detect: (mA: string, mB: string) =>
      ((/sso.*mandatory|mfa.*enforce.*all/i.test(mA) && /allow.*password.*only|bypass.*mfa/i.test(mB)) ||
       (/sso.*mandatory|mfa.*enforce.*all/i.test(mB) && /allow.*password.*only|bypass.*mfa/i.test(mA))),
    explanation:
      'Security policy violation: mandatory SSO/MFA policy conflicts with an active memory permitting password-only login.',
    recommendation:
      'Mark the password-only memory as disputed or revoked to maintain organizational compliance audits.',
  },
  {
    topic: 'Project Ownership & Leadership',
    severity: 'medium' as const,
    detect: (mA: string, mB: string) =>
      ((/lead.*project|owner.*project/i.test(mA) && /lead.*project|owner.*project/i.test(mB) &&
        mA.toLowerCase().slice(0, 30) !== mB.toLowerCase().slice(0, 30))),
    explanation:
      'Dual or competing ownership claims for the same project or initiative.',
    recommendation:
      'Confirm the current RACI matrix with the engineering manager and designate primary owner vs contributor.',
  },
];

export async function detectOrganizationalContradictions(organizationId: string): Promise<Contradiction[]> {
  const activeMemories = await db.query.memories.findMany({
    where: and(
      eq(memories.organizationId, organizationId),
      eq(memories.status, 'active')
    ),
    orderBy: [memories.createdAt],
  });

  const contradictions: Contradiction[] = [];
  const checkedPairs = new Set<string>();

  for (let i = 0; i < activeMemories.length; i++) {
    for (let j = i + 1; j < activeMemories.length; j++) {
      const mA = activeMemories[i];
      const mB = activeMemories[j];
      const pairKey = [mA.id, mB.id].sort().join(':');
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      const textA = `${mA.title} ${mA.description}`;
      const textB = `${mB.title} ${mB.description}`;

      for (const pattern of CONTRADICTION_PATTERNS) {
        if (pattern.detect(textA, textB)) {
          contradictions.push({
            id: `contra-${mA.id.slice(0, 8)}-${mB.id.slice(0, 8)}`,
            topic: pattern.topic,
            severity: pattern.severity,
            memoryA: {
              id: mA.id,
              title: mA.title,
              description: mA.description,
              memoryType: mA.memoryType,
              confidence: mA.confidence,
              verificationStatus: mA.verificationStatus,
              createdAt: mA.createdAt,
            },
            memoryB: {
              id: mB.id,
              title: mB.title,
              description: mB.description,
              memoryType: mB.memoryType,
              confidence: mB.confidence,
              verificationStatus: mB.verificationStatus,
              createdAt: mB.createdAt,
            },
            conflictExplanation: pattern.explanation,
            resolutionRecommendation: pattern.recommendation,
          });
          break;
        }
      }
    }
  }

  return contradictions;
}

