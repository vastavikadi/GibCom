ALTER TABLE sources ADD COLUMN IF NOT EXISTS content_hash varchar(64);
ALTER TABLE sources ADD COLUMN IF NOT EXISTS extraction_mode varchar(50);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS evidence_source_ids uuid[] DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS evidence_source_ids uuid[] DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS evidence_source_ids uuid[] DEFAULT '{}';
ALTER TABLE action_proposals ADD COLUMN IF NOT EXISTS evidence_source_ids uuid[] DEFAULT '{}';
ALTER TABLE memory_versions ADD COLUMN IF NOT EXISTS valid_from timestamp;
ALTER TABLE memory_versions ADD COLUMN IF NOT EXISTS valid_until timestamp;
ALTER TABLE memory_versions ADD COLUMN IF NOT EXISTS snapshot jsonb DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS sources_duplicate_idx ON sources(organization_id, uploaded_by, content_hash) WHERE content_hash IS NOT NULL AND status <> 'deleted';
CREATE UNIQUE INDEX IF NOT EXISTS source_chunks_source_index_idx ON source_chunks(source_id, chunk_index);
CREATE UNIQUE INDEX IF NOT EXISTS memory_versions_unique_idx ON memory_versions(memory_id, version);
CREATE INDEX IF NOT EXISTS source_chunks_search_idx ON source_chunks USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS ingestion_jobs_queue_idx ON ingestion_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS memory_evidence_memory_idx ON memory_evidence(memory_id);
CREATE INDEX IF NOT EXISTS memory_evidence_source_idx ON memory_evidence(source_id);
CREATE INDEX IF NOT EXISTS sources_org_idx ON sources(organization_id);
CREATE INDEX IF NOT EXISTS events_org_time_idx ON events(organization_id, occurred_at);
ALTER TABLE memories ADD CONSTRAINT memories_confidence_range CHECK(confidence BETWEEN 0 AND 1);
ALTER TABLE relationships ADD CONSTRAINT relationships_confidence_range CHECK(confidence BETWEEN 0 AND 1);
ALTER TABLE memories ADD CONSTRAINT memories_valid_period CHECK(valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from);
ALTER TABLE relationships ADD CONSTRAINT relationships_valid_period CHECK(valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from);
ALTER TABLE memberships ADD CONSTRAINT memberships_valid_role CHECK(role IN ('employee','manager','admin','owner'));

-- Enforced tenant consistency for both ordinary and array-based foreign references.
CREATE OR REPLACE FUNCTION brain_check_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org uuid; related uuid; ids uuid[];
BEGIN
  org := (to_jsonb(NEW)->>'organization_id')::uuid;
  IF TG_TABLE_NAME='source_chunks' THEN
    IF NOT EXISTS(SELECT 1 FROM sources WHERE id=NEW.source_id AND organization_id=org) THEN RAISE EXCEPTION 'cross-tenant source'; END IF;
  ELSIF TG_TABLE_NAME='memory_evidence' THEN
    SELECT organization_id INTO org FROM memories WHERE id=NEW.memory_id;
    IF NEW.source_id IS NULL OR NOT EXISTS(SELECT 1 FROM sources WHERE id=NEW.source_id AND organization_id=org) THEN RAISE EXCEPTION 'cross-tenant evidence'; END IF;
    IF NEW.source_chunk_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM source_chunks WHERE id=NEW.source_chunk_id AND source_id=NEW.source_id AND organization_id=org) THEN RAISE EXCEPTION 'invalid evidence chunk'; END IF;
  ELSIF TG_TABLE_NAME='relationships' THEN
    IF NOT EXISTS(SELECT 1 FROM entities WHERE id=NEW.source_entity_id AND organization_id=org) OR NOT EXISTS(SELECT 1 FROM entities WHERE id=NEW.target_entity_id AND organization_id=org) THEN RAISE EXCEPTION 'cross-tenant relationship'; END IF;
  END IF;
  IF TG_TABLE_NAME IN ('entities','relationships','events','action_proposals') THEN
    ids := NEW.evidence_source_ids;
    FOREACH related IN ARRAY coalesce(ids,'{}') LOOP
      IF NOT EXISTS(SELECT 1 FROM sources WHERE id=related AND organization_id=org) THEN RAISE EXCEPTION 'cross-tenant provenance'; END IF;
    END LOOP;
  END IF;
  IF TG_TABLE_NAME='memories' THEN
    FOREACH related IN ARRAY coalesce(NEW.related_entity_ids,'{}') || CASE WHEN NEW.subject_entity_id IS NULL THEN '{}'::uuid[] ELSE ARRAY[NEW.subject_entity_id] END LOOP
      IF NOT EXISTS(SELECT 1 FROM entities WHERE id=related AND organization_id=org) THEN RAISE EXCEPTION 'cross-tenant memory entity'; END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['source_chunks','memory_evidence','relationships','entities','events','action_proposals','memories'] LOOP
    EXECUTE format('CREATE TRIGGER tenant_links BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION brain_check_tenant_links()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION brain_is_member(org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT org::text = current_setting('brain.organization_id',true) AND EXISTS(SELECT 1 FROM memberships WHERE organization_id=org AND user_id=nullif(current_setting('brain.user_id',true),'')::uuid)
$$;
CREATE OR REPLACE FUNCTION brain_can_read_source(source uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM sources s JOIN memberships m ON m.organization_id=s.organization_id AND m.user_id=nullif(current_setting('brain.user_id',true),'')::uuid
    WHERE s.id=source AND brain_is_member(s.organization_id) AND s.status <> 'deleted' AND
    (s.access_policy='organization' OR (s.access_policy IN ('private','restricted') AND s.uploaded_by=m.user_id) OR
    (s.access_policy='restricted' AND (m.user_id=ANY(s.allowed_user_ids) OR m.role=ANY(s.allowed_roles)))))
$$;
CREATE OR REPLACE FUNCTION brain_all_sources(ids uuid[]) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(cardinality(ids),0)>0 AND NOT EXISTS(SELECT 1 FROM unnest(ids) id WHERE NOT brain_can_read_source(id))
$$;
CREATE OR REPLACE FUNCTION brain_can_read_memory(memory uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM memories m WHERE m.id=memory AND m.status <> 'deleted' AND brain_is_member(m.organization_id))
  AND EXISTS(SELECT 1 FROM memory_evidence WHERE memory_id=memory)
  AND NOT EXISTS(SELECT 1 FROM memory_evidence WHERE memory_id=memory AND (source_id IS NULL OR NOT brain_can_read_source(source_id)))
$$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['sources','source_chunks','entities','relationships','memories','decisions','events','corrections','ingestion_jobs','conversations','action_proposals','audit_logs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I FOR ALL USING (brain_is_member(organization_id)) WITH CHECK (brain_is_member(organization_id))', t);
  END LOOP;
END $$;
-- Restrictive read policies compose with membership policies; writes remain server-authorized.
CREATE POLICY sources_visibility ON sources AS RESTRICTIVE FOR SELECT USING(brain_can_read_source(id));
CREATE POLICY chunks_visibility ON source_chunks AS RESTRICTIVE FOR SELECT USING(brain_can_read_source(source_id));
CREATE POLICY memories_visibility ON memories AS RESTRICTIVE FOR SELECT USING(brain_can_read_memory(id));
CREATE POLICY entities_visibility ON entities AS RESTRICTIVE FOR SELECT USING(brain_all_sources(evidence_source_ids));
CREATE POLICY relationships_visibility ON relationships AS RESTRICTIVE FOR SELECT USING(brain_all_sources(evidence_source_ids));
CREATE POLICY events_visibility ON events AS RESTRICTIVE FOR SELECT USING(brain_all_sources(evidence_source_ids));
CREATE POLICY actions_visibility ON action_proposals AS RESTRICTIVE FOR SELECT USING(proposed_by=nullif(current_setting('brain.user_id',true),'')::uuid AND (cardinality(evidence_source_ids)=0 OR brain_all_sources(evidence_source_ids)));
CREATE POLICY conversations_visibility ON conversations AS RESTRICTIVE FOR SELECT USING(user_id=nullif(current_setting('brain.user_id',true),'')::uuid);
ALTER TABLE memory_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_visibility ON memory_evidence USING(brain_can_read_memory(memory_id)) WITH CHECK(brain_can_read_source(source_id));
ALTER TABLE memory_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY versions_visibility ON memory_versions USING(brain_can_read_memory(memory_id));
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_visibility ON messages USING(EXISTS(SELECT 1 FROM conversations c WHERE c.id=conversation_id AND brain_is_member(c.organization_id) AND c.user_id=nullif(current_setting('brain.user_id',true),'')::uuid) AND (role='user' OR cardinality(evidence_source_ids)=0 OR brain_all_sources(evidence_source_ids)));
