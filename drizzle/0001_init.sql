-- Company's Brain - Database Schema (pgvector)
-- Run: psql -U postgres -d gibcom -f drizzle/0001_init.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables in reverse order for clean re-creation
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS action_proposals CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS corrections CASCADE;
DROP TABLE IF EXISTS memory_versions CASCADE;
DROP TABLE IF EXISTS memory_evidence CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS decisions CASCADE;
DROP TABLE IF EXISTS memories CASCADE;
DROP TABLE IF EXISTS relationships CASCADE;
DROP TABLE IF EXISTS entities CASCADE;
DROP TABLE IF EXISTS ingestion_jobs CASCADE;
DROP TABLE IF EXISTS source_chunks CASCADE;
DROP TABLE IF EXISTS sources CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 1. organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 2. users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  role VARCHAR(50) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 3. memberships
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE UNIQUE INDEX memberships_user_org_idx ON memberships(user_id, organization_id);

-- 4. sources
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title VARCHAR(500) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  mime_type VARCHAR(100),
  file_path VARCHAR(1000),
  file_size INTEGER,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES users(id),
  access_policy VARCHAR(50) DEFAULT 'organization',
  allowed_user_ids UUID[] DEFAULT '{}',
  allowed_roles VARCHAR(50)[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 5. source_chunks (pgvector embedding)
CREATE TABLE source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  page_number INTEGER,
  section VARCHAR(500),
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

-- 6. entities
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type VARCHAR(50) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  attributes JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX entities_org_type_idx ON entities(organization_id, entity_type);
CREATE INDEX entities_org_name_idx ON entities(organization_id, name);

-- 7. relationships
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  source_entity_id UUID NOT NULL REFERENCES entities(id),
  target_entity_id UUID NOT NULL REFERENCES entities(id),
  relationship_type VARCHAR(100) NOT NULL,
  attributes JSONB DEFAULT '{}',
  confidence REAL DEFAULT 0.5,
  evidence_source_ids UUID[] DEFAULT '{}',
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX relationships_source_entity_idx ON relationships(source_entity_id);
CREATE INDEX relationships_target_entity_idx ON relationships(target_entity_id);

-- 8. memories (pgvector embedding)
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  memory_type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  subject_entity_id UUID REFERENCES entities(id),
  related_entity_ids UUID[] DEFAULT '{}',
  attributes JSONB DEFAULT '{}',
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  recorded_at TIMESTAMP DEFAULT now(),
  confidence REAL DEFAULT 0.5,
  verification_status VARCHAR(50) DEFAULT 'unverified',
  status VARCHAR(50) DEFAULT 'active',
  access_policy VARCHAR(50) DEFAULT 'inherit_source',
  created_by VARCHAR(50) DEFAULT 'system',
  version INTEGER DEFAULT 1,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX memories_org_type_idx ON memories(organization_id, memory_type);
CREATE INDEX memories_org_status_idx ON memories(organization_id, status);

-- 9. memory_evidence
CREATE TABLE memory_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id),
  source_id UUID REFERENCES sources(id),
  source_chunk_id UUID REFERENCES source_chunks(id),
  evidence_type VARCHAR(50) DEFAULT 'supports',
  excerpt TEXT,
  confidence REAL DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT now()
);

-- 10. decisions
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  memory_id UUID REFERENCES memories(id),
  entity_id UUID REFERENCES entities(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  rationale TEXT,
  alternatives JSONB DEFAULT '[]',
  outcome TEXT,
  made_by UUID REFERENCES users(id),
  made_at TIMESTAMP,
  impact VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 11. events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_id UUID REFERENCES entities(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  event_type VARCHAR(50),
  occurred_at TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

-- 12. memory_versions
CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id),
  version INTEGER NOT NULL,
  title VARCHAR(500),
  description TEXT,
  attributes JSONB,
  confidence REAL,
  verification_status VARCHAR(50),
  changed_by VARCHAR(100),
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 13. corrections
CREATE TABLE corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  memory_id UUID REFERENCES memories(id),
  user_id UUID NOT NULL REFERENCES users(id),
  correction_type VARCHAR(50),
  original_content TEXT,
  corrected_content TEXT NOT NULL,
  explanation TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 14. ingestion_jobs
CREATE TABLE ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  source_id UUID REFERENCES sources(id),
  job_type VARCHAR(50) DEFAULT 'document',
  status VARCHAR(50) DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  current_step VARCHAR(200),
  error TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 15. conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500),
  summary TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 16. messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  related_memory_ids UUID[] DEFAULT '{}',
  related_entity_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

-- 17. action_proposals
CREATE TABLE action_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  proposed_by UUID REFERENCES users(id),
  action_type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  related_entity_ids UUID[] DEFAULT '{}',
  related_memory_ids UUID[] DEFAULT '{}',
  proposed_execution JSONB DEFAULT '{}',
  required_permissions VARCHAR(100)[] DEFAULT '{}',
  approval_status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  execution_status VARCHAR(50),
  execution_result JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 18. audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX audit_logs_org_action_idx ON audit_logs(organization_id, action);
CREATE INDEX audit_logs_org_created_idx ON audit_logs(organization_id, created_at);
