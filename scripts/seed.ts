/**
 * Seed script for Company's Brain demo data
 *
 * Creates a realistic synthetic organization "Acme Corp" with:
 * - 8 employees across 4 departments
 * - 5 projects
 * - 2 customer relationships (1 lost deal)
 * - Multiple decisions, events, processes
 * - Interconnected memories and relationships
 *
 * Usage: npx tsx scripts/seed.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/db/schema';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Fixed IDs for referencing
const ORG_ID = '11111111-1111-1111-1111-111111111111';
const USERS = {
  sarah: '22222222-0001-0001-0001-000000000001',
  marcus: '22222222-0001-0001-0001-000000000002',
  elena: '22222222-0001-0001-0001-000000000003',
  david: '22222222-0001-0001-0001-000000000004',
  priya: '22222222-0001-0001-0001-000000000005',
  james: '22222222-0001-0001-0001-000000000006',
  lisa: '22222222-0001-0001-0001-000000000007',
  alex: '22222222-0001-0001-0001-000000000008',
};
const ENTITIES: Record<string, string> = {};
const MEMORIES: Record<string, string> = {};

function eid(name: string): string {
  if (!ENTITIES[name]) ENTITIES[name] = uuid();
  return ENTITIES[name];
}

function mid(name: string): string {
  if (!MEMORIES[name]) MEMORIES[name] = uuid();
  return MEMORIES[name];
}

// Simple deterministic embedding for seed data
function seedEmbedding(text: string, dims = 1536): number[] {
  const vec = new Float64Array(dims);
  const normalized = text.toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) - h + normalized.charCodeAt(i)) | 0;
  }
  const words = normalized.split(/\s+/);
  for (let i = 0; i < dims; i++) {
    let seed = h ^ (i * 2654435761);
    for (const w of words) {
      for (let c = 0; c < w.length; c++) {
        seed = ((seed << 5) - seed + w.charCodeAt(c)) | 0;
      }
    }
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    vec[i] = (seed & 0x7fffffff) / 0x7fffffff;
  }
  let mag = 0;
  for (let i = 0; i < dims; i++) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag);
  const result: number[] = [];
  for (let i = 0; i < dims; i++) result.push(vec[i] / mag);
  return result;
}

async function seed() {
  console.log('🧠 Seeding Company\'s Brain demo data...\n');

  // Enable pgvector
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
  console.log('✓ pgvector extension enabled');

  // Clear existing data in reverse dependency order
  const tables = [
    'audit_logs', 'action_proposals', 'messages', 'conversations',
    'corrections', 'memory_versions', 'memory_evidence', 'events',
    'decisions', 'memories', 'relationships', 'entities',
    'ingestion_jobs', 'source_chunks', 'sources', 'memberships',
    'users', 'organizations',
  ];
  for (const t of tables) {
    await db.execute(sql.raw(`DELETE FROM ${t}`));
  }
  console.log('✓ Cleared existing data');

  // 1. Organization
  await db.insert(schema.organizations).values({
    id: ORG_ID,
    name: 'Acme Corp',
    slug: 'acme-corp',
    description: 'A mid-stage B2B SaaS company building enterprise payment infrastructure',
    settings: { industry: 'fintech', size: '50-100' },
  });
  console.log('✓ Created organization: Acme Corp');

  // 2. Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const usersData = [
    { id: USERS.sarah, email: 'sarah@acmecorp.com', name: 'Sarah Chen', role: 'owner' },
    { id: USERS.marcus, email: 'marcus@acmecorp.com', name: 'Marcus Johnson', role: 'admin' },
    { id: USERS.elena, email: 'elena@acmecorp.com', name: 'Elena Rodriguez', role: 'manager' },
    { id: USERS.david, email: 'david@acmecorp.com', name: 'David Kim', role: 'employee' },
    { id: USERS.priya, email: 'priya@acmecorp.com', name: 'Priya Patel', role: 'employee' },
    { id: USERS.james, email: 'james@acmecorp.com', name: 'James Wright', role: 'manager' },
    { id: USERS.lisa, email: 'lisa@acmecorp.com', name: 'Lisa Thompson', role: 'employee' },
    { id: USERS.alex, email: 'alex@acmecorp.com', name: 'Alex Novak', role: 'employee' },
  ];

  for (const u of usersData) {
    await db.insert(schema.users).values({ ...u, passwordHash });
    await db.insert(schema.memberships).values({
      id: uuid(), userId: u.id, organizationId: ORG_ID, role: u.role,
    });
  }
  console.log('✓ Created 8 users with memberships');

  // 3. Entities
  const entitiesData = [
    // People
    { id: eid('Sarah Chen'), type: 'person', name: 'Sarah Chen', desc: 'CTO & Co-founder. Expert in distributed systems and payment infrastructure. Leads all technical decisions.', attrs: { role: 'CTO', department: 'Engineering', expertise: ['distributed-systems', 'payments', 'architecture'] } },
    { id: eid('Marcus Johnson'), type: 'person', name: 'Marcus Johnson', desc: 'VP of Engineering. Manages engineering teams, owns project delivery.', attrs: { role: 'VP Engineering', department: 'Engineering', expertise: ['team-management', 'agile', 'backend'] } },
    { id: eid('Elena Rodriguez'), type: 'person', name: 'Elena Rodriguez', desc: 'Head of Sales. Manages customer relationships and sales pipeline.', attrs: { role: 'Head of Sales', department: 'Sales', expertise: ['enterprise-sales', 'negotiations', 'CRM'] } },
    { id: eid('David Kim'), type: 'person', name: 'David Kim', desc: 'Senior Backend Engineer. Core contributor to payment processing engine.', attrs: { role: 'Senior Engineer', department: 'Engineering', expertise: ['golang', 'payment-processing', 'microservices'] } },
    { id: eid('Priya Patel'), type: 'person', name: 'Priya Patel', desc: 'Product Manager. Owns product roadmap and customer requirements.', attrs: { role: 'Product Manager', department: 'Product', expertise: ['product-strategy', 'user-research', 'roadmaps'] } },
    { id: eid('James Wright'), type: 'person', name: 'James Wright', desc: 'Head of Customer Success. Manages onboarding and customer retention.', attrs: { role: 'Head of CS', department: 'Customer Success', expertise: ['onboarding', 'retention', 'support'] } },
    { id: eid('Lisa Thompson'), type: 'person', name: 'Lisa Thompson', desc: 'Frontend Engineer. Builds the merchant dashboard.', attrs: { role: 'Frontend Engineer', department: 'Engineering', expertise: ['react', 'typescript', 'UI/UX'] } },
    { id: eid('Alex Novak'), type: 'person', name: 'Alex Novak', desc: 'DevOps Engineer. Manages infrastructure, CI/CD, and monitoring.', attrs: { role: 'DevOps Engineer', department: 'Engineering', expertise: ['kubernetes', 'aws', 'monitoring', 'terraform'] } },

    // Departments
    { id: eid('Engineering'), type: 'department', name: 'Engineering', desc: 'Product development and infrastructure', attrs: { headcount: 25 } },
    { id: eid('Sales'), type: 'department', name: 'Sales', desc: 'Revenue and customer acquisition', attrs: { headcount: 8 } },
    { id: eid('Product'), type: 'department', name: 'Product', desc: 'Product strategy and management', attrs: { headcount: 5 } },
    { id: eid('Customer Success'), type: 'department', name: 'Customer Success', desc: 'Customer onboarding and retention', attrs: { headcount: 6 } },

    // Projects
    { id: eid('Project Atlas'), type: 'project', name: 'Project Atlas', desc: 'Next-generation payment processing engine. Complete rebuild of the core payment pipeline for higher throughput and lower latency.', attrs: { status: 'active', startDate: '2026-01-15', targetDate: '2026-09-01', priority: 'high' } },
    { id: eid('Merchant Dashboard v2'), type: 'project', name: 'Merchant Dashboard v2', desc: 'Complete redesign of the merchant-facing dashboard with real-time analytics.', attrs: { status: 'active', startDate: '2026-03-01', targetDate: '2026-07-01', priority: 'medium' } },
    { id: eid('API Gateway'), type: 'project', name: 'API Gateway', desc: 'Unified API gateway for all external-facing services with rate limiting and webhook support.', attrs: { status: 'completed', completedDate: '2026-06-15', priority: 'high' } },
    { id: eid('Compliance Engine'), type: 'project', name: 'Compliance Engine', desc: 'Automated PCI-DSS and SOC2 compliance monitoring and reporting.', attrs: { status: 'active', startDate: '2026-04-01', priority: 'high' } },
    { id: eid('Mobile SDK'), type: 'project', name: 'Mobile SDK', desc: 'Native iOS and Android SDKs for payment integration.', attrs: { status: 'planning', priority: 'medium' } },

    // Customers
    { id: eid('ABC Technologies'), type: 'customer', name: 'ABC Technologies', desc: 'Former prospect. E-commerce platform with 5000+ merchants. Lost deal in Q2 2026.', attrs: { industry: 'e-commerce', size: 'enterprise', status: 'lost', annualValue: 450000 } },
    { id: eid('GlobalRetail Inc'), type: 'customer', name: 'GlobalRetail Inc', desc: 'Current enterprise customer. Large retail chain with 200+ stores. Active since 2025.', attrs: { industry: 'retail', size: 'enterprise', status: 'active', annualValue: 320000 } },

    // Technologies
    { id: eid('PostgreSQL'), type: 'technology', name: 'PostgreSQL', desc: 'Primary relational database for all transactional data.', attrs: { category: 'database' } },
    { id: eid('Kubernetes'), type: 'technology', name: 'Kubernetes', desc: 'Container orchestration for all microservices.', attrs: { category: 'infrastructure' } },
    { id: eid('Go'), type: 'technology', name: 'Go', desc: 'Primary backend language for payment processing services.', attrs: { category: 'language' } },
    { id: eid('React'), type: 'technology', name: 'React', desc: 'Frontend framework for merchant dashboard.', attrs: { category: 'frontend' } },

    // Processes
    { id: eid('Customer Onboarding'), type: 'process', name: 'Customer Onboarding', desc: 'Standard process for onboarding new enterprise customers. 5 stages: Initial call → Requirements → Setup → Migration → Go-live.', attrs: { owner: 'James Wright', avgDuration: '6 weeks' } },
    { id: eid('Incident Response'), type: 'process', name: 'Incident Response', desc: 'Protocol for handling production incidents. P0-P3 severity levels.', attrs: { owner: 'Alex Novak', lastUpdated: '2026-05-01' } },
  ];

  for (const e of entitiesData) {
    await db.insert(schema.entities).values({
      id: e.id,
      organizationId: ORG_ID,
      entityType: e.type,
      name: e.name,
      description: e.desc,
      attributes: e.attrs || {},
    });
  }
  console.log(`✓ Created ${entitiesData.length} entities`);

  // 4. Relationships
  const relsData = [
    // People → Departments
    { src: 'Sarah Chen', tgt: 'Engineering', type: 'REPORTS_TO', conf: 0.95 },
    { src: 'Marcus Johnson', tgt: 'Engineering', type: 'REPORTS_TO', conf: 0.95 },
    { src: 'David Kim', tgt: 'Engineering', type: 'REPORTS_TO', conf: 0.95 },
    { src: 'Lisa Thompson', tgt: 'Engineering', type: 'REPORTS_TO', conf: 0.95 },
    { src: 'Alex Novak', tgt: 'Engineering', type: 'REPORTS_TO', conf: 0.95 },
    { src: 'Elena Rodriguez', tgt: 'Sales', type: 'REPORTS_TO', conf: 0.95 },
    { src: 'Priya Patel', tgt: 'Product', type: 'REPORTS_TO', conf: 0.95 },
    { src: 'James Wright', tgt: 'Customer Success', type: 'REPORTS_TO', conf: 0.95 },

    // People → Projects
    { src: 'Sarah Chen', tgt: 'Project Atlas', type: 'OWNS', conf: 0.9 },
    { src: 'Marcus Johnson', tgt: 'Project Atlas', type: 'WORKS_ON', conf: 0.9 },
    { src: 'David Kim', tgt: 'Project Atlas', type: 'WORKS_ON', conf: 0.95 },
    { src: 'Lisa Thompson', tgt: 'Merchant Dashboard v2', type: 'WORKS_ON', conf: 0.95 },
    { src: 'Alex Novak', tgt: 'API Gateway', type: 'OWNS', conf: 0.9 },
    { src: 'Alex Novak', tgt: 'Compliance Engine', type: 'WORKS_ON', conf: 0.8 },
    { src: 'Priya Patel', tgt: 'Merchant Dashboard v2', type: 'OWNS', conf: 0.9 },
    { src: 'Priya Patel', tgt: 'Mobile SDK', type: 'OWNS', conf: 0.85 },

    // People → Technologies
    { src: 'Sarah Chen', tgt: 'PostgreSQL', type: 'KNOWS_ABOUT', conf: 0.95 },
    { src: 'Sarah Chen', tgt: 'Go', type: 'KNOWS_ABOUT', conf: 0.9 },
    { src: 'David Kim', tgt: 'Go', type: 'KNOWS_ABOUT', conf: 0.95 },
    { src: 'David Kim', tgt: 'PostgreSQL', type: 'KNOWS_ABOUT', conf: 0.9 },
    { src: 'Lisa Thompson', tgt: 'React', type: 'KNOWS_ABOUT', conf: 0.95 },
    { src: 'Alex Novak', tgt: 'Kubernetes', type: 'KNOWS_ABOUT', conf: 0.95 },

    // Projects → Technologies
    { src: 'Project Atlas', tgt: 'Go', type: 'REQUIRES', conf: 0.9 },
    { src: 'Project Atlas', tgt: 'PostgreSQL', type: 'REQUIRES', conf: 0.9 },
    { src: 'Merchant Dashboard v2', tgt: 'React', type: 'REQUIRES', conf: 0.9 },
    { src: 'API Gateway', tgt: 'Kubernetes', type: 'REQUIRES', conf: 0.85 },

    // Project dependencies
    { src: 'Merchant Dashboard v2', tgt: 'API Gateway', type: 'DEPENDS_ON', conf: 0.85 },
    { src: 'Mobile SDK', tgt: 'API Gateway', type: 'DEPENDS_ON', conf: 0.9 },

    // Customer relationships
    { src: 'Elena Rodriguez', tgt: 'ABC Technologies', type: 'COMMUNICATES_WITH', conf: 0.9 },
    { src: 'Elena Rodriguez', tgt: 'GlobalRetail Inc', type: 'COMMUNICATES_WITH', conf: 0.9 },
    { src: 'James Wright', tgt: 'GlobalRetail Inc', type: 'COMMUNICATES_WITH', conf: 0.85 },

    // Processes
    { src: 'James Wright', tgt: 'Customer Onboarding', type: 'OWNS', conf: 0.95 },
    { src: 'Alex Novak', tgt: 'Incident Response', type: 'OWNS', conf: 0.9 },
  ];

  for (const r of relsData) {
    await db.insert(schema.relationships).values({
      id: uuid(),
      organizationId: ORG_ID,
      sourceEntityId: eid(r.src),
      targetEntityId: eid(r.tgt),
      relationshipType: r.type,
      confidence: r.conf,
    });
  }
  console.log(`✓ Created ${relsData.length} relationships`);

  // 5. Sources (simulated documents)
  const sourcesData = [
    { id: uuid(), title: 'Q2 2026 Sales Pipeline Review', type: 'document', content: `Q2 2026 Sales Pipeline Review\n\nABC Technologies Deal Post-Mortem\n\nWe lost the ABC Technologies deal worth approximately $450K annual value. ABC Technologies is an e-commerce platform serving 5000+ merchants.\n\nTimeline:\n- January 2026: Initial contact via Elena Rodriguez. ABC expressed interest in our payment processing.\n- February 2026: Technical evaluation began. They tested our API and found it robust for batch processing.\n- March 2026: ABC Technologies required real-time webhook notifications for instant payment confirmations. Our API Gateway did not support webhooks at this time.\n- April 2026: ABC raised concerns about our lack of real-time capabilities. Elena escalated to Sarah Chen.\n- May 2026: Sarah proposed a custom webhook integration, but the timeline (8 weeks) was too long. ABC needed it within 3 weeks.\n- June 2026: ABC Technologies signed with CompetitorX, who offered built-in webhook support.\n\nKey Lessons:\n1. Our API Gateway lacked real-time webhook support during the evaluation period.\n2. The 8-week timeline for custom integration was not competitive.\n3. We have since completed the API Gateway project (June 2026) which now includes webhook support.\n4. Future enterprise deals should have a faster path to custom technical requirements.\n\nContributing factors:\n- Technical gap: No real-time webhooks when the customer needed them\n- Slow response: 8-week estimate vs 3-week requirement\n- Competitive pressure: CompetitorX had the feature built-in\n\nElena Rodriguez noted that the relationship with ABC's CTO was strong and they may reconsider when their current contract is up for renewal.` },
    { id: uuid(), title: 'Project Atlas Architecture Decision Record', type: 'document', content: `Architecture Decision Record: Project Atlas\n\nDecision: Use PostgreSQL instead of MongoDB for the payment processing engine\n\nDate: January 15, 2026\nDecision Maker: Sarah Chen (CTO)\nStatus: Approved\n\nContext:\nProject Atlas is rebuilding our core payment processing engine. We needed to choose between PostgreSQL and MongoDB for the primary data store.\n\nAlternatives Considered:\n1. MongoDB: Better for flexible schemas, horizontal scaling\n2. PostgreSQL: Strong ACID transactions, mature ecosystem, existing expertise\n3. CockroachDB: Distributed SQL, but higher operational complexity\n\nDecision: PostgreSQL\n\nRationale:\n- Payment processing requires strong transactional guarantees (ACID compliance)\n- Our team has deep PostgreSQL expertise, especially David Kim and Sarah Chen\n- PostgreSQL's JSONB support provides schema flexibility where needed\n- Lower operational overhead compared to distributed databases\n- pgvector extension supports future AI/ML features\n\nConsequences:\n- Need to carefully design sharding strategy for horizontal scaling\n- David Kim will lead the database architecture\n- We accept the trade-off of more complex horizontal scaling vs. transaction safety\n\nProject Atlas Status:\n- Started: January 15, 2026\n- Target completion: September 1, 2026\n- Current status: In development, Phase 2\n- Team: Sarah Chen (owner), Marcus Johnson (engineering lead), David Kim (core engineer)\n\nThe decision to use PostgreSQL aligns with our overall technical philosophy of preferring proven, well-understood technologies for critical financial infrastructure.` },
    { id: uuid(), title: 'Customer Onboarding Process Document', type: 'document', content: `Customer Onboarding Process\nOwner: James Wright, Head of Customer Success\nLast Updated: May 2026\n\nStandard Enterprise Customer Onboarding Process:\n\nStage 1: Initial Call (Week 1)\n- Discovery call with sales and customer success\n- Understand customer requirements and timeline\n- Assign dedicated customer success manager\n- Deliverable: Customer Requirements Document\n\nStage 2: Requirements Gathering (Week 2)\n- Technical requirements review with engineering\n- Integration architecture planning\n- Security and compliance review\n- Deliverable: Technical Integration Plan\n\nStage 3: Environment Setup (Week 3)\n- Provision sandbox environment\n- API credentials and documentation\n- Configure merchant settings\n- Deliverable: Sandbox Access\n\nStage 4: Data Migration (Weeks 4-5)\n- Historical transaction data import\n- Customer data mapping\n- Reconciliation testing\n- This stage typically takes the longest\n- Deliverable: Migration Verification Report\n\nStage 5: Go-Live Training (Week 6)\n- Staff training on merchant dashboard\n- Monitoring setup\n- Production cutover plan\n- Post-go-live support plan\n- Deliverable: Go-Live Certification\n\nAverage onboarding duration: 6 weeks\nSuccess rate: 94%\n\nKnown Issues:\n- Stage 4 (data migration) often runs 1-2 weeks over schedule\n- Some customers require custom API configurations that need engineering involvement\n- GlobalRetail Inc onboarding took 9 weeks due to complex legacy data migration\n\nImprovement Suggestions:\n- Create self-service migration tools for common formats\n- Build migration template library\n- Earlier engineering engagement for complex customers` },
    { id: uuid(), title: 'Engineering Team Structure and Expertise Map', type: 'document', content: `Engineering Team Structure - Q3 2026\n\nTeam Leads:\n- Sarah Chen (CTO): Distributed systems, payment architecture, system design\n- Marcus Johnson (VP Eng): Team management, project delivery, backend services\n\nSenior Engineers:\n- David Kim: Core payment processing engine. THE expert on our billing reconciliation system. Built it in 2024 and is the sole maintainer. Knows Go, PostgreSQL, and our entire payment data model inside out. CRITICAL: David is the only person who deeply understands the legacy payment reconciliation system.\n- Alex Novak: DevOps and infrastructure. Owns our Kubernetes clusters, CI/CD pipelines, monitoring (Datadog). Also manages the Incident Response process.\n\nMid-Level Engineers:\n- Lisa Thompson: Frontend. Building Merchant Dashboard v2 in React/TypeScript. Strong UI/UX sense.\n\nExpertise Concentration Risks:\n1. Payment reconciliation: Only David Kim knows this system. He built it in 2024 and has maintained it alone. If David were unavailable, no one else could maintain or debug the reconciliation pipeline.\n2. Kubernetes infrastructure: Primarily Alex Novak's domain. Marcus has some knowledge but hasn't operated it hands-on.\n3. Legacy billing APIs: Sarah Chen is the only one who remembers why certain design decisions were made in the original billing API (pre-2025).\n\nMitigation needed: Document reconciliation system, cross-train at least one engineer.` },
    { id: uuid(), title: 'GlobalRetail Inc Partnership Notes', type: 'document', content: `GlobalRetail Inc - Customer Relationship Notes\n\nCustomer Since: September 2025\nAnnual Contract Value: $320,000\nPrimary Contact: Jennifer Walsh (VP Technology)\nOur Account Manager: Elena Rodriguez (Sales) + James Wright (CS)\n\nRelationship History:\n- Sep 2025: Signed initial contract for payment processing (200 stores)\n- Dec 2025: Expanded to include fraud detection add-on\n- Feb 2026: Reported latency issues during holiday season peak\n- Mar 2026: Sarah Chen personally worked on performance optimization\n- May 2026: Contract renewal discussion started - they want real-time analytics\n- Jul 2026: Renewal confirmed with 15% price increase, added real-time dashboard\n\nKey Requirements:\n- PCI-DSS Level 1 compliance (mandatory)\n- 99.99% uptime SLA\n- Sub-200ms transaction processing\n- Real-time analytics dashboard (new requirement for renewal)\n- Dedicated support channel\n\nOnboarding Experience:\n- Took 9 weeks instead of the standard 6\n- Data migration was complex due to their legacy POS system\n- James Wright handled escalations professionally\n- They specifically praised David Kim's technical support during integration\n\nRisk Factors:\n- They're evaluating competitor offerings for mobile payments\n- Jennifer Walsh is considering a vendor consolidation strategy\n- Need to deliver real-time dashboard (Merchant Dashboard v2) by Q3 2026` },
  ];

  for (const s of sourcesData) {
    await db.insert(schema.sources).values({
      id: s.id,
      organizationId: ORG_ID,
      title: s.title,
      sourceType: s.type,
      mimeType: 'text/plain',
      content: s.content,
      status: 'completed',
      accessPolicy: 'organization',
      uploadedBy: USERS.sarah,
    });

    // Create chunks
    const chunks = s.content.split(/\n\n/).filter(c => c.trim().length > 50);
    for (let i = 0; i < chunks.length; i++) {
      await db.insert(schema.sourceChunks).values({
        id: uuid(),
        sourceId: s.id,
        organizationId: ORG_ID,
        content: chunks[i],
        chunkIndex: i,
        embedding: seedEmbedding(chunks[i]),
      });
    }
  }
  console.log(`✓ Created ${sourcesData.length} sources with chunks`);

  // 6. Memories
  const memoriesData = [
    // People memories
    { id: mid('david-reconciliation'), type: 'people', title: 'David Kim is sole expert on payment reconciliation', desc: 'David Kim built the legacy payment reconciliation system in 2024 and is the only person who deeply understands it. He maintains it alone. This represents a critical single-person dependency.', subjectId: eid('David Kim'), related: [eid('David Kim'), eid('Project Atlas')], conf: 0.95, verif: 'verified', attrs: { expertise: 'payment-reconciliation', risk: 'single-person-dependency' } },
    { id: mid('sarah-architect'), type: 'people', title: 'Sarah Chen is the primary technical architect', desc: 'Sarah Chen (CTO) leads all major technical decisions. She has deep expertise in distributed systems, payment architecture, and PostgreSQL. She is the only person who remembers design decisions from the original billing API.', subjectId: eid('Sarah Chen'), related: [eid('Sarah Chen'), eid('Project Atlas'), eid('PostgreSQL')], conf: 0.9, verif: 'verified', attrs: { role: 'CTO', expertise: ['distributed-systems', 'payments'] } },
    { id: mid('alex-k8s'), type: 'people', title: 'Alex Novak owns Kubernetes infrastructure', desc: 'Alex Novak manages all Kubernetes clusters, CI/CD pipelines, and monitoring. He also owns the Incident Response process. Marcus has some knowledge but hasn\'t operated it hands-on.', subjectId: eid('Alex Novak'), related: [eid('Alex Novak'), eid('Kubernetes')], conf: 0.9, verif: 'supported', attrs: {} },

    // Decision memories
    { id: mid('postgres-decision'), type: 'decision', title: 'Chose PostgreSQL over MongoDB for Project Atlas', desc: 'Sarah Chen decided to use PostgreSQL instead of MongoDB for the payment processing engine. Rationale: ACID transactions needed for payment processing, team expertise, JSONB flexibility, pgvector for future AI. Trade-off: more complex horizontal scaling.', subjectId: eid('Project Atlas'), related: [eid('Sarah Chen'), eid('PostgreSQL'), eid('Project Atlas')], conf: 0.95, verif: 'verified', validFrom: new Date('2026-01-15'), attrs: { decision: 'PostgreSQL over MongoDB', madeBy: 'Sarah Chen', impact: 'high' } },
    { id: mid('webhook-gap'), type: 'decision', title: 'API Gateway initially built without webhook support', desc: 'The original API Gateway was built without real-time webhook support. This was identified as a gap when ABC Technologies required webhooks during their evaluation. Webhooks were added in the June 2026 release.', subjectId: eid('API Gateway'), related: [eid('API Gateway'), eid('ABC Technologies')], conf: 0.9, verif: 'verified', attrs: { gap: 'no-webhooks', resolved: 'June 2026' } },

    // Project memories
    { id: mid('atlas-status'), type: 'project', title: 'Project Atlas is in Phase 2 development', desc: 'Project Atlas (next-gen payment engine) started January 2026, targeting September 2026 completion. Currently in Phase 2. Led by Sarah Chen, with Marcus Johnson as engineering lead and David Kim as core engineer.', subjectId: eid('Project Atlas'), related: [eid('Project Atlas'), eid('Sarah Chen'), eid('Marcus Johnson'), eid('David Kim')], conf: 0.9, verif: 'supported', validFrom: new Date('2026-01-15'), attrs: { phase: 2, status: 'in-development' } },
    { id: mid('dashboard-v2'), type: 'project', title: 'Merchant Dashboard v2 redesign in progress', desc: 'Complete redesign of merchant-facing dashboard with real-time analytics. Led by Lisa Thompson (frontend) and Priya Patel (product). Depends on API Gateway completion. Critical for GlobalRetail Inc renewal.', subjectId: eid('Merchant Dashboard v2'), related: [eid('Merchant Dashboard v2'), eid('Lisa Thompson'), eid('Priya Patel'), eid('GlobalRetail Inc')], conf: 0.85, verif: 'supported', attrs: {} },
    { id: mid('api-gateway-done'), type: 'project', title: 'API Gateway project completed with webhook support', desc: 'API Gateway was completed in June 2026. Now includes rate limiting, unified API interface, and real-time webhook support (which was missing when ABC Technologies evaluated our platform).', subjectId: eid('API Gateway'), related: [eid('API Gateway'), eid('Alex Novak')], conf: 0.95, verif: 'verified', validFrom: new Date('2026-06-15'), attrs: { status: 'completed' } },

    // Relationship memories
    { id: mid('abc-lost'), type: 'relationship', title: 'Lost ABC Technologies deal due to missing webhook support', desc: 'ABC Technologies ($450K annual value) evaluated our platform in Q1-Q2 2026 but signed with CompetitorX. Primary reason: we lacked real-time webhook notifications when they needed them. Our proposed 8-week custom integration timeline was too long (they needed 3 weeks). Elena Rodriguez maintains the relationship for potential future re-engagement.', subjectId: eid('ABC Technologies'), related: [eid('ABC Technologies'), eid('Elena Rodriguez'), eid('API Gateway')], conf: 0.95, verif: 'verified', attrs: { dealValue: 450000, reason: 'missing-webhooks', competitor: 'CompetitorX' } },
    { id: mid('globalretail-renewal'), type: 'relationship', title: 'GlobalRetail Inc renewed with 15% price increase', desc: 'GlobalRetail Inc ($320K → $368K annual value) renewed their contract in July 2026. Added real-time dashboard requirement. They specifically praised David Kim\'s technical support. Risk: they are evaluating competitor mobile payments.', subjectId: eid('GlobalRetail Inc'), related: [eid('GlobalRetail Inc'), eid('Elena Rodriguez'), eid('James Wright'), eid('David Kim')], conf: 0.9, verif: 'verified', validFrom: new Date('2026-07-01'), attrs: { annualValue: 368000, risk: 'competitor-evaluation' } },

    // Process memories
    { id: mid('onboarding-process'), type: 'process', title: 'Customer onboarding is a 5-stage, 6-week process', desc: 'Standard enterprise onboarding: 1) Initial Call (week 1), 2) Requirements Gathering (week 2), 3) Environment Setup (week 3), 4) Data Migration (weeks 4-5), 5) Go-Live Training (week 6). Stage 4 frequently runs over schedule. Process owned by James Wright.', subjectId: eid('Customer Onboarding'), related: [eid('Customer Onboarding'), eid('James Wright')], conf: 0.9, verif: 'verified', attrs: { stages: 5, avgDuration: '6 weeks', bottleneck: 'Stage 4 - Data Migration' } },

    // Experience memories
    { id: mid('lesson-webhooks'), type: 'experience', title: 'Lesson: Missing features cost us $450K deal', desc: 'The ABC Technologies loss taught us that gaps in real-time capabilities can cost major deals. The 8-week timeline for custom integration was not competitive. We need faster paths to address enterprise technical requirements. The API Gateway project has since addressed the webhook gap.', subjectId: eid('ABC Technologies'), related: [eid('ABC Technologies'), eid('API Gateway')], conf: 0.85, verif: 'supported', attrs: { category: 'lesson-learned', impact: 'high' } },
    { id: mid('lesson-globalretail-onboarding'), type: 'experience', title: 'GlobalRetail onboarding took 9 weeks due to legacy data', desc: 'GlobalRetail Inc\'s onboarding took 9 weeks instead of the standard 6 weeks. The primary bottleneck was data migration from their complex legacy POS system. Improvement: need self-service migration tools and template library.', subjectId: eid('GlobalRetail Inc'), related: [eid('GlobalRetail Inc'), eid('James Wright'), eid('Customer Onboarding')], conf: 0.85, verif: 'supported', attrs: { category: 'process-improvement' } },
  ];

  for (const m of memoriesData) {
    await db.insert(schema.memories).values({
      id: m.id,
      organizationId: ORG_ID,
      memoryType: m.type,
      title: m.title,
      description: m.desc,
      subjectEntityId: m.subjectId || null,
      relatedEntityIds: m.related || [],
      confidence: m.conf,
      verificationStatus: m.verif,
      status: 'active',
      accessPolicy: 'inherit_source',
      createdBy: 'system',
      attributes: m.attrs || {},
      validFrom: m.validFrom || null,
      embedding: seedEmbedding(m.title + ' ' + m.desc),
    });

    // Link evidence to first source
    if (sourcesData[0]) {
      await db.insert(schema.memoryEvidence).values({
        id: uuid(),
        memoryId: m.id,
        sourceId: sourcesData[0].id,
        evidenceType: 'supports',
        excerpt: m.desc.slice(0, 300),
        confidence: m.conf,
      });
    }
  }
  console.log(`✓ Created ${memoriesData.length} memories with evidence`);

  // 7. Decisions
  const decisionsData = [
    { title: 'Use PostgreSQL for Project Atlas', desc: 'Chose PostgreSQL over MongoDB and CockroachDB for payment processing engine', rationale: 'ACID transactions, team expertise, JSONB flexibility', alternatives: [{ option: 'MongoDB', reason: 'Rejected due to weaker transaction guarantees' }, { option: 'CockroachDB', reason: 'Higher operational complexity' }], outcome: 'PostgreSQL deployed, working well. David Kim leading DB architecture.', madeBy: USERS.sarah, madeAt: new Date('2026-01-15'), impact: 'high', entityId: eid('Project Atlas'), memoryId: mid('postgres-decision') },
    { title: 'Rebuild payment engine (Project Atlas)', desc: 'Decision to completely rebuild the core payment pipeline', rationale: 'Legacy system hitting performance limits, technical debt too high', alternatives: [{ option: 'Incremental refactor', reason: 'Would take longer and not solve fundamental issues' }], outcome: 'Project started Jan 2026, in Phase 2', madeBy: USERS.sarah, madeAt: new Date('2025-12-01'), impact: 'high', entityId: eid('Project Atlas'), memoryId: mid('atlas-status') },
  ];

  for (const d of decisionsData) {
    await db.insert(schema.decisions).values({
      id: uuid(), organizationId: ORG_ID,
      title: d.title, description: d.desc, rationale: d.rationale,
      alternatives: d.alternatives, outcome: d.outcome,
      madeBy: d.madeBy, madeAt: d.madeAt, impact: d.impact,
      entityId: d.entityId, memoryId: d.memoryId,
    });
  }
  console.log(`✓ Created ${decisionsData.length} decisions`);

  // 8. Events (timeline)
  const eventsData = [
    { title: 'Project Atlas kickoff', type: 'milestone', date: '2026-01-15', entityId: eid('Project Atlas') },
    { title: 'ABC Technologies initial contact', type: 'meeting', date: '2026-01-20', entityId: eid('ABC Technologies') },
    { title: 'ABC Technologies technical evaluation', type: 'review', date: '2026-02-15', entityId: eid('ABC Technologies') },
    { title: 'ABC Technologies raises webhook concern', type: 'blocker', date: '2026-03-10', entityId: eid('ABC Technologies') },
    { title: 'GlobalRetail latency issues reported', type: 'blocker', date: '2026-02-28', entityId: eid('GlobalRetail Inc') },
    { title: 'Merchant Dashboard v2 project started', type: 'milestone', date: '2026-03-01', entityId: eid('Merchant Dashboard v2') },
    { title: 'Performance optimization for GlobalRetail', type: 'achievement', date: '2026-03-15', entityId: eid('GlobalRetail Inc') },
    { title: 'Sarah proposed custom webhook for ABC', type: 'meeting', date: '2026-05-01', entityId: eid('ABC Technologies') },
    { title: 'ABC Technologies signed with CompetitorX', type: 'failure', date: '2026-06-01', entityId: eid('ABC Technologies') },
    { title: 'API Gateway completed with webhook support', type: 'achievement', date: '2026-06-15', entityId: eid('API Gateway') },
    { title: 'GlobalRetail contract renewed (+15%)', type: 'achievement', date: '2026-07-01', entityId: eid('GlobalRetail Inc') },
    { title: 'Compliance Engine project started', type: 'milestone', date: '2026-04-01', entityId: eid('Compliance Engine') },
    { title: 'Marcus Johnson promoted to VP Engineering', type: 'change', date: '2026-02-01', entityId: eid('Marcus Johnson') },
  ];

  for (const e of eventsData) {
    await db.insert(schema.events).values({
      id: uuid(), organizationId: ORG_ID,
      entityId: e.entityId,
      title: e.title, eventType: e.type,
      occurredAt: new Date(e.date),
      description: e.title,
    });
  }
  console.log(`✓ Created ${eventsData.length} events`);

  console.log('\n✅ Seed complete! Company\'s Brain is ready.\n');
  console.log('Demo credentials:');
  console.log('  Email: sarah@acmecorp.com');
  console.log('  Password: password123');
  console.log('\nAll 8 users share the same password: password123');

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

