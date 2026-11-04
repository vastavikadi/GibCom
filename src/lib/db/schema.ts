import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ---------------------------------------------------------------------------
// Embedding column (pgvector)
// ---------------------------------------------------------------------------
const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    if (!value) return [];
    try {
      // pgvector returns '[0.1,0.2,...]' format
      const cleaned = value.replace(/^\[|\]$/g, "");
      return cleaned.split(",").map(Number);
    } catch {
      return [];
    }
  },
});

// ---------------------------------------------------------------------------
// 1. organizations
// ---------------------------------------------------------------------------
export const organizations = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 2. users
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  role: varchar("role", { length: 50 }).default("employee"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 3. memberships
// ---------------------------------------------------------------------------
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    role: varchar("role", { length: 50 }).notNull().default("employee"), // owner | admin | manager | employee
    permissions: jsonb("permissions").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("memberships_user_org_idx").on(
      table.userId,
      table.organizationId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// 4. sources
// ---------------------------------------------------------------------------
export const sources = pgTable("sources", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // document | conversation | email | meeting | manual
  mimeType: varchar("mime_type", { length: 100 }),
  filePath: varchar("file_path", { length: 1000 }),
  fileSize: integer("file_size"),
  content: text("content"),
  metadata: jsonb("metadata").default({}),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  accessPolicy: varchar("access_policy", { length: 50 }).default(
    "organization",
  ), // organization | team | restricted | private
  allowedUserIds: uuid("allowed_user_ids")
    .array()
    .default(sql`'{}'::uuid[]`),
  allowedRoles: varchar("allowed_roles", { length: 50 })
    .array()
    .default(sql`'{}'::varchar[]`),
  status: varchar("status", { length: 50 }).default("pending"), // pending | processing | completed | failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 5. source_chunks
// ---------------------------------------------------------------------------
export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceId: uuid("source_id")
      .references(() => sources.id)
      .notNull(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    pageNumber: integer("page_number"),
    section: varchar("section", { length: 500 }),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [],
);

// ---------------------------------------------------------------------------
// 6. entities
// ---------------------------------------------------------------------------
export const entities = pgTable(
  "entities",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(), // person | department | project | customer | vendor | partner | decision | process | technology | document | event | experience
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    attributes: jsonb("attributes").default({}),
    status: varchar("status", { length: 50 }).default("active"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("entities_org_type_idx").on(table.organizationId, table.entityType),
    index("entities_org_name_idx").on(table.organizationId, table.name),
  ],
);

// ---------------------------------------------------------------------------
// 7. relationships
// ---------------------------------------------------------------------------
export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    sourceEntityId: uuid("source_entity_id")
      .references(() => entities.id)
      .notNull(),
    targetEntityId: uuid("target_entity_id")
      .references(() => entities.id)
      .notNull(),
    relationshipType: varchar("relationship_type", { length: 100 }).notNull(), // WORKS_ON | OWNS | KNOWS_ABOUT | MADE | INVOLVES | DEPENDS_ON | REPORTS_TO | RELATED_TO | COMMUNICATES_WITH | RESULTED_IN | REQUIRES | REPLACED_BY
    attributes: jsonb("attributes").default({}),
    confidence: real("confidence").default(0.5),
    evidenceSourceIds: uuid("evidence_source_ids")
      .array()
      .default(sql`'{}'::uuid[]`),
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("relationships_source_entity_idx").on(table.sourceEntityId),
    index("relationships_target_entity_idx").on(table.targetEntityId),
  ],
);

// ---------------------------------------------------------------------------
// 8. memories
// ---------------------------------------------------------------------------
export const memories = pgTable(
  "memories",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    memoryType: varchar("memory_type", { length: 50 }).notNull(), // people | process | decision | relationship | project | experience
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull(),
    subjectEntityId: uuid("subject_entity_id").references(() => entities.id),
    relatedEntityIds: uuid("related_entity_ids")
      .array()
      .default(sql`'{}'::uuid[]`),
    attributes: jsonb("attributes").default({}),
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),
    recordedAt: timestamp("recorded_at").defaultNow(),
    confidence: real("confidence").default(0.5),
    verificationStatus: varchar("verification_status", { length: 50 }).default(
      "unverified",
    ), // unverified | supported | verified | disputed | superseded
    status: varchar("status", { length: 50 }).default("active"), // active | archived | deleted
    accessPolicy: varchar("access_policy", { length: 50 }).default(
      "inherit_source",
    ),
    createdBy: varchar("created_by", { length: 50 }).default("system"), // system | employee uuid
    version: integer("version").default(1),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("memories_org_type_idx").on(table.organizationId, table.memoryType),
    index("memories_org_status_idx").on(table.organizationId, table.status),
  ],
);

// ---------------------------------------------------------------------------
// 9. memory_evidence
// ---------------------------------------------------------------------------
export const memoryEvidence = pgTable("memory_evidence", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  memoryId: uuid("memory_id")
    .references(() => memories.id)
    .notNull(),
  sourceId: uuid("source_id").references(() => sources.id),
  sourceChunkId: uuid("source_chunk_id").references(() => sourceChunks.id),
  evidenceType: varchar("evidence_type", { length: 50 }).default("supports"), // supports | contradicts | related
  excerpt: text("excerpt"),
  confidence: real("confidence").default(0.5),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 10. decisions
// ---------------------------------------------------------------------------
export const decisions = pgTable("decisions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  memoryId: uuid("memory_id").references(() => memories.id),
  entityId: uuid("entity_id").references(() => entities.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  rationale: text("rationale"),
  alternatives: jsonb("alternatives").default([]),
  outcome: text("outcome"),
  madeBy: uuid("made_by").references(() => users.id),
  madeAt: timestamp("made_at"),
  impact: varchar("impact", { length: 50 }), // high | medium | low
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 11. events
// ---------------------------------------------------------------------------
export const events = pgTable("events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  entityId: uuid("entity_id").references(() => entities.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  eventType: varchar("event_type", { length: 50 }), // milestone | blocker | change | achievement | failure | meeting | review
  occurredAt: timestamp("occurred_at").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 12. memory_versions
// ---------------------------------------------------------------------------
export const memoryVersions = pgTable("memory_versions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  memoryId: uuid("memory_id")
    .references(() => memories.id)
    .notNull(),
  version: integer("version").notNull(),
  title: varchar("title", { length: 500 }),
  description: text("description"),
  attributes: jsonb("attributes"),
  confidence: real("confidence"),
  verificationStatus: varchar("verification_status", { length: 50 }),
  changedBy: varchar("changed_by", { length: 100 }),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 13. corrections
// ---------------------------------------------------------------------------
export const corrections = pgTable("corrections", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  memoryId: uuid("memory_id").references(() => memories.id),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  correctionType: varchar("correction_type", { length: 50 }), // factual | context | outdated | missing | wrong
  originalContent: text("original_content"),
  correctedContent: text("corrected_content").notNull(),
  explanation: text("explanation"),
  status: varchar("status", { length: 50 }).default("pending"), // pending | accepted | rejected
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 14. ingestion_jobs
// ---------------------------------------------------------------------------
export const ingestionJobs = pgTable("ingestion_jobs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  sourceId: uuid("source_id").references(() => sources.id),
  jobType: varchar("job_type", { length: 50 }).default("document"),
  status: varchar("status", { length: 50 }).default("queued"), // queued | processing | completed | failed | retrying
  progress: integer("progress").default(0),
  totalSteps: integer("total_steps").default(0),
  currentStep: varchar("current_step", { length: 200 }),
  error: text("error"),
  metadata: jsonb("metadata").default({}),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 15. conversations
// ---------------------------------------------------------------------------
export const conversations = pgTable("conversations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  title: varchar("title", { length: 500 }),
  summary: text("summary"),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 16. messages
// ---------------------------------------------------------------------------
export const messages = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id)
    .notNull(),
  role: varchar("role", { length: 20 }).notNull(), // user | assistant | system
  content: text("content").notNull(),
  citations: jsonb("citations").default([]),
  relatedMemoryIds: uuid("related_memory_ids")
    .array()
    .default(sql`'{}'::uuid[]`),
  relatedEntityIds: uuid("related_entity_ids")
    .array()
    .default(sql`'{}'::uuid[]`),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 17. action_proposals
// ---------------------------------------------------------------------------
export const actionProposals = pgTable("action_proposals", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  proposedBy: uuid("proposed_by").references(() => users.id),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  relatedEntityIds: uuid("related_entity_ids")
    .array()
    .default(sql`'{}'::uuid[]`),
  relatedMemoryIds: uuid("related_memory_ids")
    .array()
    .default(sql`'{}'::uuid[]`),
  proposedExecution: jsonb("proposed_execution").default({}),
  requiredPermissions: varchar("required_permissions", { length: 100 })
    .array()
    .default(sql`'{}'::varchar[]`),
  approvalStatus: varchar("approval_status", { length: 50 }).default("pending"), // pending | approved | rejected | executed
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  executionStatus: varchar("execution_status", { length: 50 }),
  executionResult: jsonb("execution_result"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// 18. audit_logs
// ---------------------------------------------------------------------------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 100 }),
    resourceId: uuid("resource_id"),
    details: jsonb("details").default({}),
    ipAddress: varchar("ip_address", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("audit_logs_org_action_idx").on(table.organizationId, table.action),
    index("audit_logs_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);

// ===========================================================================
// RELATIONS
// ===========================================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  sources: many(sources),
  sourceChunks: many(sourceChunks),
  entities: many(entities),
  relationships: many(relationships),
  memories: many(memories),
  decisions: many(decisions),
  events: many(events),
  corrections: many(corrections),
  ingestionJobs: many(ingestionJobs),
  conversations: many(conversations),
  actionProposals: many(actionProposals),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  sources: many(sources),
  decisions: many(decisions),
  corrections: many(corrections),
  conversations: many(conversations),
  actionProposals: many(actionProposals),
  auditLogs: many(auditLogs),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [sources.organizationId],
    references: [organizations.id],
  }),
  uploader: one(users, {
    fields: [sources.uploadedBy],
    references: [users.id],
  }),
  chunks: many(sourceChunks),
  memoryEvidence: many(memoryEvidence),
  ingestionJobs: many(ingestionJobs),
}));

export const sourceChunksRelations = relations(
  sourceChunks,
  ({ one, many }) => ({
    source: one(sources, {
      fields: [sourceChunks.sourceId],
      references: [sources.id],
    }),
    organization: one(organizations, {
      fields: [sourceChunks.organizationId],
      references: [organizations.id],
    }),
    memoryEvidence: many(memoryEvidence),
  }),
);

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [entities.organizationId],
    references: [organizations.id],
  }),
  outgoingRelationships: many(relationships, { relationName: "sourceEntity" }),
  incomingRelationships: many(relationships, { relationName: "targetEntity" }),
  memories: many(memories),
  decisions: many(decisions),
  events: many(events),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  organization: one(organizations, {
    fields: [relationships.organizationId],
    references: [organizations.id],
  }),
  sourceEntity: one(entities, {
    fields: [relationships.sourceEntityId],
    references: [entities.id],
    relationName: "sourceEntity",
  }),
  targetEntity: one(entities, {
    fields: [relationships.targetEntityId],
    references: [entities.id],
    relationName: "targetEntity",
  }),
}));

export const memoriesRelations = relations(memories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [memories.organizationId],
    references: [organizations.id],
  }),
  subjectEntity: one(entities, {
    fields: [memories.subjectEntityId],
    references: [entities.id],
  }),
  evidence: many(memoryEvidence),
  versions: many(memoryVersions),
  decisions: many(decisions),
  corrections: many(corrections),
}));

export const memoryEvidenceRelations = relations(memoryEvidence, ({ one }) => ({
  memory: one(memories, {
    fields: [memoryEvidence.memoryId],
    references: [memories.id],
  }),
  source: one(sources, {
    fields: [memoryEvidence.sourceId],
    references: [sources.id],
  }),
  sourceChunk: one(sourceChunks, {
    fields: [memoryEvidence.sourceChunkId],
    references: [sourceChunks.id],
  }),
}));

export const decisionsRelations = relations(decisions, ({ one }) => ({
  organization: one(organizations, {
    fields: [decisions.organizationId],
    references: [organizations.id],
  }),
  memory: one(memories, {
    fields: [decisions.memoryId],
    references: [memories.id],
  }),
  entity: one(entities, {
    fields: [decisions.entityId],
    references: [entities.id],
  }),
  maker: one(users, {
    fields: [decisions.madeBy],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  entity: one(entities, {
    fields: [events.entityId],
    references: [entities.id],
  }),
}));

export const memoryVersionsRelations = relations(memoryVersions, ({ one }) => ({
  memory: one(memories, {
    fields: [memoryVersions.memoryId],
    references: [memories.id],
  }),
}));

export const correctionsRelations = relations(corrections, ({ one }) => ({
  organization: one(organizations, {
    fields: [corrections.organizationId],
    references: [organizations.id],
  }),
  memory: one(memories, {
    fields: [corrections.memoryId],
    references: [memories.id],
  }),
  user: one(users, {
    fields: [corrections.userId],
    references: [users.id],
    relationName: "correctionAuthor",
  }),
  reviewer: one(users, {
    fields: [corrections.reviewedBy],
    references: [users.id],
    relationName: "correctionReviewer",
  }),
}));

export const ingestionJobsRelations = relations(ingestionJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [ingestionJobs.organizationId],
    references: [organizations.id],
  }),
  source: one(sources, {
    fields: [ingestionJobs.sourceId],
    references: [sources.id],
  }),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [conversations.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const actionProposalsRelations = relations(
  actionProposals,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [actionProposals.organizationId],
      references: [organizations.id],
    }),
    proposer: one(users, {
      fields: [actionProposals.proposedBy],
      references: [users.id],
      relationName: "proposalProposer",
    }),
    approver: one(users, {
      fields: [actionProposals.approvedBy],
      references: [users.id],
      relationName: "proposalApprover",
    }),
  }),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ===========================================================================
// ZOD SCHEMAS
// ===========================================================================

// organizations
export const insertOrganizationSchema = createInsertSchema(organizations);
export const selectOrganizationSchema = createSelectSchema(organizations);
export type InsertOrganization = typeof organizations.$inferInsert;
export type SelectOrganization = typeof organizations.$inferSelect;

// users
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

// memberships
export const insertMembershipSchema = createInsertSchema(memberships);
export const selectMembershipSchema = createSelectSchema(memberships);
export type InsertMembership = typeof memberships.$inferInsert;
export type SelectMembership = typeof memberships.$inferSelect;

// sources
export const insertSourceSchema = createInsertSchema(sources);
export const selectSourceSchema = createSelectSchema(sources);
export type InsertSource = typeof sources.$inferInsert;
export type SelectSource = typeof sources.$inferSelect;

// source_chunks
export const insertSourceChunkSchema = createInsertSchema(sourceChunks);
export const selectSourceChunkSchema = createSelectSchema(sourceChunks);
export type InsertSourceChunk = typeof sourceChunks.$inferInsert;
export type SelectSourceChunk = typeof sourceChunks.$inferSelect;

// entities
export const insertEntitySchema = createInsertSchema(entities);
export const selectEntitySchema = createSelectSchema(entities);
export type InsertEntity = typeof entities.$inferInsert;
export type SelectEntity = typeof entities.$inferSelect;

// relationships
export const insertRelationshipSchema = createInsertSchema(relationships);
export const selectRelationshipSchema = createSelectSchema(relationships);
export type InsertRelationship = typeof relationships.$inferInsert;
export type SelectRelationship = typeof relationships.$inferSelect;

// memories
export const insertMemorySchema = createInsertSchema(memories);
export const selectMemorySchema = createSelectSchema(memories);
export type InsertMemory = typeof memories.$inferInsert;
export type SelectMemory = typeof memories.$inferSelect;

// memory_evidence
export const insertMemoryEvidenceSchema = createInsertSchema(memoryEvidence);
export const selectMemoryEvidenceSchema = createSelectSchema(memoryEvidence);
export type InsertMemoryEvidence = typeof memoryEvidence.$inferInsert;
export type SelectMemoryEvidence = typeof memoryEvidence.$inferSelect;

// decisions
export const insertDecisionSchema = createInsertSchema(decisions);
export const selectDecisionSchema = createSelectSchema(decisions);
export type InsertDecision = typeof decisions.$inferInsert;
export type SelectDecision = typeof decisions.$inferSelect;

// events
export const insertEventSchema = createInsertSchema(events);
export const selectEventSchema = createSelectSchema(events);
export type InsertEvent = typeof events.$inferInsert;
export type SelectEvent = typeof events.$inferSelect;

// memory_versions
export const insertMemoryVersionSchema = createInsertSchema(memoryVersions);
export const selectMemoryVersionSchema = createSelectSchema(memoryVersions);
export type InsertMemoryVersion = typeof memoryVersions.$inferInsert;
export type SelectMemoryVersion = typeof memoryVersions.$inferSelect;

// corrections
export const insertCorrectionSchema = createInsertSchema(corrections);
export const selectCorrectionSchema = createSelectSchema(corrections);
export type InsertCorrection = typeof corrections.$inferInsert;
export type SelectCorrection = typeof corrections.$inferSelect;

// ingestion_jobs
export const insertIngestionJobSchema = createInsertSchema(ingestionJobs);
export const selectIngestionJobSchema = createSelectSchema(ingestionJobs);
export type InsertIngestionJob = typeof ingestionJobs.$inferInsert;
export type SelectIngestionJob = typeof ingestionJobs.$inferSelect;

// conversations
export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);
export type InsertConversation = typeof conversations.$inferInsert;
export type SelectConversation = typeof conversations.$inferSelect;

// messages
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;

// action_proposals
export const insertActionProposalSchema = createInsertSchema(actionProposals);
export const selectActionProposalSchema = createSelectSchema(actionProposals);
export type InsertActionProposal = typeof actionProposals.$inferInsert;
export type SelectActionProposal = typeof actionProposals.$inferSelect;

// audit_logs
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type SelectAuditLog = typeof auditLogs.$inferSelect;
