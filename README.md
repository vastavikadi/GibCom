# Company's Brain — The Intelligence Layer of an Organization

An AI-native organizational memory and intelligence platform that continuously learns from company activity, preserves institutional knowledge, understands organizational context, and helps every employee make better decisions and execute work.

---

## 1. Product Overview & Architecture

### The Fundamental Promise
> **Your company never has to start learning from scratch.**  
> *Remember · Understand · Connect · Anticipate · Act*

Company's Brain is built on a **Hybrid Memory Architecture**:
1. **Relational Data Model:** 18 normalized PostgreSQL tables managing multi-tenant organizational workspaces, users, role-based access, version histories, decisions, events, and audit trails.
2. **Knowledge Graph:** Typed, directional relationships (`WORKS_ON`, `OWNS`, `KNOWS_ABOUT`, `MADE`, `INVOLVES`, `DEPENDS_ON`, etc.) connecting people, departments, projects, customers, processes, and technologies.
3. **pgvector Semantic Memory:** Native 1536-dimensional vector embeddings with cosine similarity distance (`<=>`) across source chunks and memory items.
4. **Temporal Memory:** Valid-time dimensions (`validFrom`, `validUntil`, `occurredAt`) enabling historical reconstruction (e.g. what was believed at the time of a decision vs. current state).
5. **Trust & Provenance:** Every claim is tied to supporting or conflicting source evidence with exact excerpts and verification status (`verified`, `supported`, `unverified`, `disputed`, `superseded`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPERIENCE LAYER (UI)                           │
│  Ask Brain · Explore Brain · Brain Insights · Brain Actions · Teach    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        INTELLIGENCE ENGINE                             │
│  Intent Classification · Hybrid Retrieval · Context Reconstruction     │
│  Answer Synthesis with Exact Citations · Fact vs Assumption Separation │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    ORGANIZATIONAL MEMORY ENGINE                        │
│  PostgreSQL (Relational) · pgvector (Vectors) · Knowledge Graph        │
│  Temporal Valid-Time History · Source Provenance & Audit Logs          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. What Was Implemented

### Backend Core
- **Database Schema (`src/lib/db/schema.ts`):** 18 tables in PostgreSQL with pgvector support, Drizzle ORM relations, and Zod validation.
- **pgvector Vector Search:** Native `<=>` cosine distance queries across `source_chunks` and `memories`.
- **Hybrid Retrieval Engine (`src/lib/engine/retrieval.ts`):** Combines semantic vector similarity, PostgreSQL full-text search (`ts_rank`), 2-hop knowledge graph traversal, and temporal timeline filtering.
- **Intelligence Engine (`src/lib/engine/intelligence.ts`):**
  - Query intent classification (historical, strategic, operational, organizational, predictive).
  - Context reconstruction for "why" / historical investigations.
  - Multi-perspective synthesis with verifiable citations.
  - Grounded heuristic reasoning fallback when Meta AI API keys are not present.
- **Ingestion Pipeline (`src/lib/ingestion/`):** Multi-format parsing (PDF, DOCX, TXT, Markdown, CSV), chunking with overlap, deterministic/API embeddings, and entity/relationship extraction.
- **RBAC & Provenance (`src/lib/permissions/`):** Role-based access (owner, admin, manager, employee), source visibility policies (`organization`, `private`, `restricted`), and audit logging.

### Full-Featured Responsive UI
- **Dashboard (`/dashboard`):** Real-time statistics, knowledge distribution by dimension, recently learned memories, architectural decisions, and quick search.
- **Ask Brain (`/ask`):** Conversational intelligence interface supporting deep reasoning, source citations, timelines, facts vs. assumptions, and follow-up prompts.
- **Explore Brain (`/explore`):** Interactive knowledge graph visualization with entity filters, detail inspectors, and relationship mappings.
- **Teach Brain (`/teach`):** 3-stage guided employee knowledge contribution (Capture -> Review/Refine -> Confirm & Save) with automatic entity linking.
- **Brain Insights (`/insights`):** Evidence-backed proactive discoveries (single-person dependencies like David Kim, deal post-mortems like ABC Technologies, and onboarding bottlenecks).
- **Brain Actions (`/actions`):** 6 actionable draft workflows (Project Handover, Meeting Brief, Customer Report, Onboarding Guide, SOP Documentation, Workflow Improvement) grounded in organizational memory.
- **Administration (`/admin`):** Document source library with drag-and-drop upload, memory review & verification, and workspace settings.

---

## 3. Quickstart & Installation

### Prerequisites
- **Node.js** (v18.17+ or v20+)
- **PostgreSQL** (v14+ with `pgvector` extension)
- **pnpm** (or `npm`)

### 1. Environment Configuration
Create `.env.local` in the project root:
```env
# Database
DATABASE_URL=postgresql://postgres:123456@localhost:5432/gibcom

# NextAuth
NEXTAUTH_SECRET=123456
NEXTAUTH_URL=http://localhost:3000

# Meta AI (Optional - platform falls back to grounded heuristic reasoning if not configured)
META_AI_API_KEY=your-meta-ai-api-key
META_AI_BASE_URL=https://api.meta.ai/v1
META_AI_MODEL_ID=meta-llama/Llama-3.3-70B-Instruct

# Upload Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
```

### 2. Initialize Database & Run Seed
```powershell
# 1. Run PostgreSQL schema migration with pgvector
$env:PGPASSWORD='your_password'; psql -U postgres -d your_db -f drizzle/0001_init.sql

# 2. Seed Acme Corp synthetic organization
npx tsx scripts/seed.ts
```

### 3. Run Development Server or Production Build
```powershell
# Start dev server
npm run dev

# Or test optimized production build
npm run build
npm start
```

Visit [http://localhost:3000](http://localhost:3000) and sign in.

---

## 4. Demo Walkthrough & Seeded Credentials

All 8 seeded employees share the password: **`password123`**

| User | Role | Department | Specialization |
| :--- | :--- | :--- | :--- |
| **sarah@acmecorp.com** | `owner` | Engineering (CTO) | Architecture, Distributed Systems, PostgreSQL decisions |
| **marcus@acmecorp.com** | `admin` | Engineering (VP) | Team delivery, Agile, Project Atlas |
| **elena@acmecorp.com** | `manager` | Sales (Head of Sales) | Enterprise accounts, ABC Technologies deal lead |
| **david@acmecorp.com** | `employee` | Engineering (Sr Backend) | **Sole maintainer of Billing Reconciliation** |
| **james@acmecorp.com** | `manager` | Customer Success (Head) | Customer Onboarding (5-stage process), GlobalRetail |
| **priya@acmecorp.com** | `employee` | Product (PM) | Merchant Dashboard v2, Mobile SDK |
| **lisa@acmecorp.com** | `employee` | Engineering (Frontend) | React, Merchant Dashboard v2 UI |
| **alex@acmecorp.com** | `employee` | Engineering (DevOps) | Kubernetes infrastructure, API Gateway |

---

## 5. Verification of the 6 Core Demo Questions

Try these exact questions in **Ask Brain** (`/ask`):

### 1. "Why did we lose ABC Technologies?"
- **Answer:** Detailed post-mortem explaining the **\$450K ACV** loss. Shows that during the Q1–Q2 2026 evaluation, ABC Technologies required real-time webhook notifications for payment confirmation. Acme's API Gateway lacked webhooks, and the offered 8-week custom integration timeline was too slow (ABC required 3 weeks). ABC signed with CompetitorX. Shows that API Gateway completed in June 2026 with native webhook support, resolving the gap.
- **Evidence:** Cites *Q2 2026 Sales Pipeline Review*.

### 2. "Who knows the most about our payment infrastructure?"
- **Answer:** Identifies **David Kim** as the primary maintainer and sole expert of the legacy payment reconciliation system built in 2024. Also highlights **Sarah Chen (CTO)** as leading overall payment architecture and **Project Atlas**.
- **Evidence:** Cites *Engineering Team Structure and Expertise Map*.

### 3. "What decisions shaped our current architecture?"
- **Answer:** Explains Sarah Chen's decision on Jan 15, 2026 to choose **PostgreSQL over MongoDB** for Project Atlas due to ACID transaction requirements in financial payments and team database expertise. Explains API Gateway unification and real-time webhook addition.
- **Evidence:** Cites *Project Atlas Architecture Decision Record*.

### 4. "What is our current customer onboarding process?"
- **Answer:** Explains James Wright's 5-stage, 6-week enterprise customer onboarding process (Initial Call, Requirements Gathering, Setup, Data Migration, Go-Live). Highlights that **Stage 4 (Data Migration)** is the primary operational bottleneck.
- **Evidence:** Cites *Customer Onboarding Process Document*.

### 5. "What happened with GlobalRetail Inc's contract?"
- **Answer:** Details the \$320,000 enterprise contract signed in September 2025, renewed in July 2026 with a **15% price increase** (\$368K). Notes that onboarding took 9 weeks due to legacy POS data mapping and that GlobalRetail specifically praised David Kim's technical support.
- **Evidence:** Cites *GlobalRetail Inc Partnership Notes*.

### 6. "What are our biggest knowledge concentration risks?"
- **Answer:** Identifies **David Kim** as a critical single-person dependency for payment reconciliation, Alex Novak for Kubernetes cluster management, and onboarding Stage 4 data migration bottlenecks.
- **Evidence:** Synthesizes findings from *Engineering Team Structure* and *Brain Insights*.

---

## 6. Test Suite & Validation

The project includes unit and integration tests covering contracts, embeddings, text chunking, and full intelligence query pipelines:

```powershell
npx vitest run
```

**Results:**
- `tests/unit/contracts.test.ts` (6 tests) — Role hierarchy, Unicode name normalization, content hashing, valid-time temporal windows, memory schema validation, self-relationship rejection.
- `tests/unit/retrieval.test.ts` (2 tests) — 1536-dimensional deterministic embedding generation and vector magnitude normalization.
- `tests/unit/processor.test.ts` (2 tests) — Document chunking with boundary detection and section header retention.
- `tests/integration/intelligence.test.ts` (3 tests) — Database-connected query pipeline answering ABC Technologies loss, David Kim expertise identification, and hybrid graph traversal.
- `tests/integration/demo-questions.test.ts` (6 tests) — Full end-to-end verification of all 6 canonical demo questions against live PostgreSQL.
- `tests/integration/members-and-insights.test.ts` (3 tests) — Member listing, owner/admin member invitations, and insight assignment & unassignment.

**Summary:** 22 passed across 6 test suites (100% pass rate).

---

## 7. Organization Collaboration & Adjustable Workspace UI

### Member Collaboration & Assignment
- **Invite / Add Members (`POST /api/members`):** Organization Owners and Admins can invite or add members by specifying their name, email, role (`admin`, `manager`, `employee`), department, and technical expertise. Automatically registers them into the organizational graph as `person` entities.
- **Assign Team Members to Insights (`POST /api/insights/assign`):** Key team members (e.g. David Kim, Sarah Chen) can be assigned to proactive organizational discoveries (such as single-person dependencies or customer deal risks) with actionable notes and timestamps, persisted directly in organizational settings.
- **Inspect Collaborators Modal:** View the active roster, their roles, departments, and areas of expertise directly from the Insights interface.

### Adjustable Panels & Ergonomics
- **Draggable Left Sidebar Resizer:** Drag the sidebar border smoothly from 68px (compact icon rail) up to 420px. Includes a one-click collapse toggle button and keyboard shortcut (`Ctrl+B`). State is persisted across browser reloads via `localStorage`.
- **Draggable Right Inspector Resizer:** Expand or compact context inspectors (in `/explore` and `/insights`) between 340px and 750px width, or minimize to full-canvas view.
- **Finished Left Navigation:** Fully interactive workspace switcher showing active organization metadata, live memory review & source library links, and real-time status badges.

