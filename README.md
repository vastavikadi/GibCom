# GibCom — The Intelligence Layer of an Organization

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-1536d-008080?style=flat&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Meta AI](https://img.shields.io/badge/Meta_AI-Muse_/_Llama-0668E1?style=flat&logo=meta&logoColor=white)](https://api.meta.ai)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM-success?style=flat&logo=shield)](https://github.com)

> **The Fundamental Promise:**  
> *Your company never has to start learning from scratch.*  
> **Remember · Understand · Connect · Anticipate · Act**

GibCom is an AI-native organizational memory and intelligence platform that continuously learns from daily company activity, preserves institutional knowledge, understands business context, and helps every employee make informed decisions and execute high-impact work.

---

## Table of Contents

1. [The Problem Statement & Why GibCom Exists](#the-problem-statement--why-gibcom-exists)
2. [What Makes GibCom Different & Superior](#what-makes-gibcom-different--superior)
3. [The Seven Dimensions of Organizational Memory](#the-seven-dimensions-of-organizational-memory)
4. [System Architecture](#system-architecture)
5. [The Hybrid Memory Data Model](#the-hybrid-memory-data-model)
6. [Core Product Modules](#core-product-modules)
7. [Enterprise Security & Encryption](#enterprise-security--encryption)
8. [Real Third-Party Connectors (Zero Mock)](#real-third-party-connectors-zero-mock)
9. [Webhooks & Continuous Ingestion Flywheel](#webhooks--continuous-ingestion-flywheel)
10. [Quickstart & Deployment Guide](#quickstart--deployment-guide)
11. [Verification & Testing](#verification--testing)

---

## The Problem Statement & Why GibCom Exists

### The Crisis of Organizational Amnesia

Modern organizations generate massive volumes of communication across Slack, GitHub, Jira, Confluence, Google Drive, email, and meetings. However, organizations remain fundamentally **amnesic**:

1. **Context Dissolves When People Leave:** When a senior engineer or product lead leaves, their mental model of *why* systems were architected a certain way leaves with them. New hires spend months re-learning lessons already paid for by the company.
2. **Decisions Are Relitigated in Vain:** Teams re-debate the same architectural decisions, discount policies, and vendor selections because the original context, rejected alternatives, and trade-offs were never persisted.
3. **Traditional Search & RAG Fail at "Why":** Document retrieval systems (traditional RAG) fetch isolated text chunks. If you ask: *"Why did we lose ABC Technologies 18 months ago?"*, simple semantic search returns a sales deck or contract draft. It cannot reconstruct the causal chain: engineering rejected a custom feature request, which delayed delivery, causing a champion departure, which resulted in deal churn.
4. **Knowledge Contradictions Grow Undetected:** As companies scale, teams establish conflicting policies in isolated silos (e.g., security mandating SSO while an ops team permits password login; a sales leader approving a 25% discount exception while finance enforces a 10% ceiling).

### The Solution: An Organizational Brain

GibCom is not another document search tool or static wiki. It is an **active intelligence layer** that transforms raw company activity into **structured, connected, temporal institutional memories**. It actively links people to decisions, projects to blockers, and policies to evidence.

---

## What Makes GibCom Different & Superior

| Capability | Traditional Search / Standard RAG | Enterprise Wikis (Confluence/Notion) | **GibCom Company's Brain** |
| :--- | :--- | :--- | :--- |
| **Data Representation** | Unstructured text chunks + vector embeddings | Static, human-written hierarchical pages | **Hybrid Memory:** Relational entities + Knowledge Graph + `pgvector` + Valid-Time history |
| **Query Understanding** | Keyword / basic semantic match | Manual folder navigation & keyword search | **Intent-driven context reconstruction** (historical, strategic, operational, predictive) |
| **Causal Reasoning** | ❌ None. Returns isolated paragraphs | ❌ None. Manual reading required | ✅ **Reconstructs the multi-step story** behind decisions and outcomes |
| **Trust & Provenance** | Probabilistic, hallucination-prone | Static timestamps, often outdated | ✅ **Every statement cites verifiable evidence excerpts** with explicit confidence scores |
| **Contradiction Detection** | ❌ None. Retrieves contradictory chunks simultaneously | ❌ None. Stale pages conflict silently | ✅ **Automated semantic discrepancy scanner** alerts admins to resolve policy/decision clashes |
| **Temporal Understanding**| ❌ "Latest chunk wins" or timestamp bias | Manual version history | ✅ **Bi-temporal tracking** (`validFrom`, `validUntil`, `occurredAt`, `supersededAt`) |
| **Action Execution** | Read-only | Manual copy-pasting | ✅ **Closed-loop execution:** Generated actions feed outcomes back into memory |
| **Connectors** | Generic web scrapers or demo mocks | Manual import | ✅ **Production REST clients & webhooks** (GitHub, Slack, Jira, Confluence, Google Drive) |

---

## The Seven Dimensions of Organizational Memory

GibCom structures all organizational knowledge across seven explicit dimensions:

```
                          ┌───────────────────────────┐
                          │     TEMPORAL MEMORY       │
                          │   (How context evolves    │
                          │    over time & epochs)    │
                          └─────────────┬─────────────┘
                                        │
         ┌───────────────┬──────────────┼──────────────┬───────────────┐
         │               │              │              │               │
   ┌─────▼─────┐   ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐   ┌─────▼─────┐
   │  PEOPLE   │   │  PROCESS  │  │ DECISION  │  │RELATIONSHIP│   │  PROJECT  │
   │  MEMORY   │   │  MEMORY   │  │  MEMORY   │  │  MEMORY   │   │  MEMORY   │
   │ Expertise │   │ Workflows │  │ Context & │  │ Customers │   │Milestones │
   │ Ownership │   │Exceptions │  │ Rationale │  │  Vendors  │   │ Blockers  │
   └───────────┘   └───────────┘  └───────────┘  └───────────┘   └───────────┘
                                        │
                                  ┌─────▼─────┐
                                  │EXPERIENCE │
                                  │  MEMORY   │
                                  │ Lessons & │
                                  │ Failures  │
                                  └───────────┘
```

1. **People Memory:** Who knows what, who owns what, past areas of expertise, and organizational authority.
2. **Process Memory:** Workflows, practices, standard operating procedures, recurring exceptions, and operational dependencies.
3. **Decision Memory:** Past choices, alternatives considered, rejected options, economic rationale, and actual outcomes.
4. **Relationship Memory:** Customers, vendors, partners, contractual commitments, champions, and churn history.
5. **Project Memory:** Milestones, technical constraints, roadblocks, and architectural evolution across initiatives.
6. **Experience Memory:** Institutional lessons, post-mortems, failures, successes, and hard-won wisdom.
7. **Temporal Memory:** A cross-cutting dimension tracking how all knowledge, beliefs, and relationships change over time.

---

## System Architecture

GibCom is architected as an enterprise-ready, layered intelligence platform:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. EXPERIENCE LAYER (UI)                        │
│  Ask Brain · Explore Brain · Brain Insights · Brain Actions · Teach    │
│  Administration · Real Data Connectors · Audit Trail · Member Hub      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       2. INTELLIGENCE ENGINE                           │
│  Intent Understanding · Hybrid Retrieval · Historical Reconstruction   │
│  Multi-Perspective Answer Synthesis · Facts vs Assumptions Separation  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  3. ORGANIZATIONAL MEMORY ENGINE                       │
│  Structured Relational Memory · Directed Knowledge Graph               │
│  Vector Memory (pgvector 1536-d) · Bi-Temporal Valid-Time History      │
│  Evidence Provenance & Verification · Human Governance & Review        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    4. KNOWLEDGE INTELLIGENCE                           │
│  Multi-Format Document Parsing · Entity Resolution & Linking           │
│  Memory Classification · Contradiction & Discrepancy Detection         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    5. INGESTION & LEARNING                             │
│  REST Connectors (Slack, GitHub, Jira, Confluence, Google Drive)       │
│  Inbound Webhook Handlers (GitHub, Slack) · Employee Guided Teaching   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  6. CROSS-CUTTING PLATFORM SERVICES                    │
│  Multi-Tenant RBAC · AES-256-GCM Secrets Encryption at Rest            │
│  Immutable Audit Logging · NextAuth Session Security · PostgreSQL DB   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## The Hybrid Memory Data Model

The platform avoids shallow document dumps by normalizing context into **18 PostgreSQL tables** with strict referential integrity and Zod schema validation:

```
organizations ────< memberships >──── users
      │                                 │
      ├───< sources >───< source_chunks (with pgvector embeddings)
      │         │
      │         └───< memory_evidence >───┐
      │                                   │
      ├───< entities >───< relationships  │
      │         │                         │
      ├───< memories >────────────────────┤
      │         ├───< memory_versions     │
      │         └───< decisions           │
      │                                   │
      ├───< events (Temporal Timeline)    │
      ├───< action_proposals ─────────────┘
      ├───< conversations >───< messages
      ├───< audit_logs (Immutable Security Trail)
      └───< corrections & feedback
```

### Memory Object Schema Contract

Every organizational memory is governed by a persistent structured contract:

```json
{
  "id": "c1f7a049-5b74-4b55-a0bc-1849a9bce001",
  "organization_id": "11111111-1111-1111-1111-111111111111",
  "memory_type": "decision",
  "title": "PostgreSQL Single Source of Truth Architecture Decision",
  "description": "Rejected dual-database NoSQL synchronization for transactional state to eliminate distributed consensus failures.",
  "subject_entity_id": "8f8b89c3-1124-4f81-a9f8-7d8b8a912e10",
  "related_entity_ids": ["3b4c5d6e-...", "7a8b9c0d-..."],
  "attributes": {
    "alternativesConsidered": ["MongoDB Atlas", "DynamoDB + Postgres CDC"],
    "decisionMaker": "sarah@acmecorp.com",
    "technicalTradeOff": "Higher schema migration rigor in exchange for ACID guarantees"
  },
  "valid_from": "2024-03-15T00:00:00Z",
  "valid_until": null,
  "confidence": 0.94,
  "verification_status": "verified",
  "status": "active",
  "evidence_ids": ["e4f5a6b7-..."],
  "created_by": "22222222-0001-0001-0001-000000000001",
  "access_policy": "organization"
}
```

---

## Core Product Modules

### 1. Ask Brain (`/ask`)
A conversational reasoning interface built on multi-perspective synthesis:
- **Query Intent Classifier:** Differentiates historical root-cause inquiries from operational lookups, organizational lookups, or policy verifications.
- **Context Reconstruction:** Rebuilds chronological narratives showing what was believed at the time versus what transpired.
- **Grounded Citations:** Every assertion links to an excerpted document or conversation with source verification.
- **Assumptions vs. Facts:** Explicitly separates verified institutional records from probabilistic inferences.
- **Temporal Unfolding:** Reveals the timeline of events leading up to the answer.

### 2. Explore Brain (`/explore`)
An interactive canvas knowledge graph visualizing the company's network:
- **Force-Directed Graph:** Visualizes connections between team members, projects, technologies, customers, and architectural decisions.
- **Adjustable Inspector:** Drag-to-resize side panels with collapsible views.
- **Three-Tier Entity Inspector:** Clicking any node reveals:
  1. *Graph Relationships:* Directional arrows with confidence scores.
  2. *Institutional Memories:* All structured memories concerning the entity.
  3. *Temporal Timeline:* Chronological events associated with the entity.

### 3. Brain Insights (`/insights`)
Continuous proactive discovery of organizational risks and opportunities:
- **Knowledge Concentration Risks:** Detects critical single points of failure (e.g., when 85% of payment gateway context lives in one engineer's head).
- **Deal Churn Post-Mortems:** Synthesizes multi-source context on lost deals.
- **Onboarding Bottlenecks:** Identifies undocumented dependencies slowing down new hires.
- **Team Collaboration:** Workspace owners can assign teammates directly to investigate and resolve surfaced insights.

### 4. Brain Actions (`/actions`)
A closed-loop execution engine that turns knowledge into action:
- **6 Action Workflows:** Generates Project Handovers, Meeting Briefs, Customer Reports, Onboarding Guides, Standard Operating Procedures, and Workflow Improvement Proposals.
- **Human Approval Gate:** Proposals remain in `pending` approval status until reviewed by authorized managers.
- **Continuous Learning Flywheel:** When an action is executed, the outcome is automatically written back into organizational memory.

### 5. Teach Brain (`/teach`)
An employee knowledge contribution workflow:
- **Guided 3-Step Wizard:** Capture context -> Review extracted entities and relationships -> Confirm and commit.
- **Clarifying Questions:** If input references ambiguous entities, the Brain prompts the user with clarifying questions before saving.
- **High-Impact Routing:** Architectural or policy decisions automatically flag for peer review.

### 6. Administration & Governance (`/admin`)
The command center for organizational truth:
- **Data Connectors Hub:** Configure and sync live credentials for Slack, GitHub, Jira, Confluence, and Google Drive.
- **Source Library:** Upload, drag-and-drop, and inspect ingested PDF, DOCX, CSV, TXT, and Markdown files.
- **Memory Review & Contradictions:** Review memories, dispute inaccuracies, mark superseded policies, and resolve semantic conflicts.
- **Audit Trail:** Complete tamper-evident log of who uploaded what, synced data, altered permissions, or executed actions.

---

## Enterprise Security & Encryption

GibCom implements defense-in-depth security principles:

### 1. AES-256-GCM Secret Encryption at Rest
Third-party API tokens (Slack bot tokens, GitHub personal access tokens, Atlassian API keys, Google Drive tokens) are never stored in plaintext. They are encrypted using **AES-256-GCM** with authenticated 128-bit authentication tags before being written to the PostgreSQL database.
- Key Derivation: Cryptographically secure 256-bit encryption key (`ENCRYPTION_KEY`).
- Unique IV: Every encrypted secret generates a unique 12-byte initialization vector.
- Tamper-Proof: Decryption verifies the GCM authentication tag, preventing tampering.

### 2. Role-Based Access Control (RBAC)
Multi-tiered hierarchy:
- `owner`: Full organization governance, workspace renaming, collaborator invites.
- `admin`: Credential configuration, live connector management, audit log access.
- `manager`: Memory verification, dispute handling, action proposal approval.
- `employee`: Knowledge querying, exploration, and teaching submissions.

### 3. Non-ASCII ByteString Header Isolation
All connector clients enforce strict ASCII ByteString validation, preventing Node.js / `undici` header translation errors when tokens are handled.

---

## Real Third-Party Connectors (Zero Mock)

GibCom communicates with live third-party platforms via official REST APIs:

| Connector | Official API | What GibCom Ingests | Security |
| :--- | :--- | :--- | :--- |
| **GitHub** | GitHub REST API v3 | Pull request discussions, ADR commits, code review comments | AES-256-GCM Personal Access Token |
| **Slack** | Slack Web API (`v2`) | Architecture channel messages, incident post-mortems, escalations | AES-256-GCM Bot User OAuth Token |
| **Jira Software** | Atlassian Cloud REST API v3 | Sprint blockers, epic requirements, retrospectives via JQL | AES-256-GCM Basic Auth API Token |
| **Confluence** | Atlassian Confluence Cloud API | Wiki spaces, technical specifications, standard operating procedures | AES-256-GCM Cloud Token, macro stripper |
| **Google Drive** | Google Drive API v3 | Google Docs (exported to text), Google Sheets (exported to CSV) | AES-256-GCM OAuth Token / API Key |

---

## Webhooks & Continuous Ingestion Flywheel

In addition to manual syncs, GibCom provides automated endpoints for real-time continuous ingestion:

1. **GitHub Webhooks (`POST /api/webhooks/github`):**
   - Receives `pull_request` (closed/merged) and `push` events.
   - Automatically ingests merged pull requests and architectural commits into organizational memory.
   - Verifies HMAC-SHA256 signatures when `GITHUB_WEBHOOK_SECRET` is configured.

2. **Slack Event Subscriptions (`POST /api/webhooks/slack`):**
   - Supports Slack's URL verification handshake (`url_verification`).
   - Ingests new message events (`message.channels`) in real time.

3. **Background Sync Runner (`POST /api/connectors/sync-all`):**
   - Secure endpoint callable by cron jobs or background schedulers (`Authorization: Bearer CRON_SECRET`).
   - Automatically cycles through all configured connectors and indexes new records.

---

## Quickstart & Deployment Guide

### Prerequisites
- **Node.js** v18.17+ or v20+
- **PostgreSQL** v14+ with the native `pgvector` extension enabled
- **pnpm** or **npm**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/gibcom.git
cd gibcom
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Database (PostgreSQL with pgvector)
DATABASE_URL=postgresql://postgres:password@localhost:5432/gibcom

# NextAuth Session Security
NEXTAUTH_SECRET=generate-a-strong-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Enterprise Encryption at Rest (32-byte hex string)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Meta AI Model Integration
META_AI_API_KEY=your-meta-ai-key
META_AI_BASE_URL=https://api.meta.ai/v1
META_AI_MODEL_ID=muse-spark-1.3

# Automated Background Sync & Webhooks
CRON_SECRET=your-secure-cron-secret
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret

# Document File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
```

### 3. Initialize Database & Seed Synthetic Enterprise Data
```bash
# Push schema migrations
npx drizzle-kit push:pg

# Seed realistic company data (Acme Corp with 8 employees, decisions, projects, and relationships)
npx tsx scripts/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Default Demo Credentials:**
- Owner: `sarah@acmecorp.com` / `password123`
- Admin: `marcus@acmecorp.com` / `password123`
- Manager: `elena@acmecorp.com` / `password123`
- Employee: `david@acmecorp.com` / `password123`

---

## Verification & Testing

GibCom includes an end-to-end integration and unit test suite verifying data integrity, retrieval accuracy, connector authentication, encryption, and governance workflows:

```bash
# Run all unit and integration test suites
npx vitest run

# Run production build validation
npm run build
```

### Test Suite Coverage
- `tests/unit/contracts.test.ts`: Data model contracts and schema validation.
- `tests/unit/processor.test.ts`: Multi-format document parser and text chunker.
- `tests/unit/retrieval.test.ts`: Hybrid retrieval score calculations.
- `tests/integration/real-connectors.test.ts`: Live API validation, token masking, and ByteString guards.
- `tests/integration/audit-and-contradictions.test.ts`: Contradiction detection and audit log logging.
- `tests/integration/actions-execution.test.ts`: Closed-loop workflow execution into organizational memory.
- `tests/integration/members-and-insights.test.ts`: Member collaboration and insight delegation.
- `tests/integration/intelligence.test.ts`: Context reconstruction and causal reasoning.
- `tests/integration/demo-questions.test.ts`: Validation of the canonical 6 organizational questions.

---

## License

This project is licensed under the Apache 2.0 License.
