import { z } from 'zod';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import * as s from '@/lib/db/schema';
import { api, HttpError, requireMinimumRole } from '@/lib/api';
import { atTime, contentHash, dateSchema, extractionSchema, hasRole, memorySchema, memoryTypes, roles } from '@/lib/domain/contracts';
import { audit, loadBrain, publicMemory, publicSource } from '@/lib/domain/store';
import { persistExtraction, recordVersion } from '@/lib/domain/memory';
import { extractKnowledge } from '@/lib/ingestion/extractor';
import { DocumentProcessor } from '@/lib/ingestion/processor';
import { ai } from '@/lib/ai';
import { askBrain } from '@/lib/engine/intelligence';

export const getMemories = api(async (_, actor, tx) => {
  const brain = await loadBrain(tx, actor);
  return brain.memories
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
    .map(publicMemory);
});

export const getSources = api(async (_, actor, tx) => {
  const brain = await loadBrain(tx, actor);
  return brain.sources.map(publicSource);
});

export const getEntities = api(async (_, actor, tx) => {
  const brain = await loadBrain(tx, actor);
  return brain.entities;
});

export const getGraph = api(async (_, actor, tx) => {
  const brain = await loadBrain(tx, actor);
  return brain.relationships;
});

export const getDashboard = api(async (_, actor, tx) => {
  const brain = await loadBrain(tx, actor);
  const current = brain.memories.filter((m) => m.status === 'active' && atTime(m, new Date()));
  const recentConversations = await tx
    .select()
    .from(s.conversations)
    .where(and(eq(s.conversations.organizationId, actor.organizationId), eq(s.conversations.userId, actor.userId)))
    .orderBy(desc(s.conversations.updatedAt))
    .limit(5);

  const [user] = await tx.select({ name: s.users.name }).from(s.users).where(eq(s.users.id, actor.userId));
  const [organization] = await tx.select().from(s.organizations).where(eq(s.organizations.id, actor.organizationId));

  return {
    totalMemories: current.length,
    totalEntities: brain.entities.length,
    totalSources: brain.sources.length,
    totalRelationships: brain.relationships.filter((r) => atTime(r, new Date())).length,
    pendingVerifications: current.filter((m) => ['unverified', 'disputed'].includes(m.verificationStatus || '')).length,
    recentMemories: [...current]
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 6)
      .map(publicMemory),
    recentDecisions: current
      .filter((m) => m.memoryType === 'decision')
      .slice(0, 3)
      .map(publicMemory),
    knowledgeByType: Object.fromEntries(
      memoryTypes.map((type) => [type, current.filter((m) => m.memoryType === type).length]),
    ),
    recentConversations,
    userName: user?.name || 'Teammate',
    organization,
    role: actor.role,
    ai: ai.status(),
  };
});

export const postAsk = api(async (request, actor, tx) => {
  const body = z
    .object({
      question: z.string().trim().min(1).max(4000),
      conversationId: z.string().uuid().optional(),
      at: dateSchema.optional(),
    })
    .parse(await request.json());

  return askBrain(tx, actor, body);
});

export const postTeach = api(async (request, actor, tx) => {
  const body = z
    .object({
      stage: z.enum(['preview', 'confirm']).optional(),
      input: z.string().trim().min(3).max(12000),
      memoryType: z.enum(memoryTypes).optional(),
      proposal: memorySchema.optional(),
      accessPolicy: z.enum(['organization', 'private']).default('organization'),
    })
    .parse(await request.json());

  const brain = await loadBrain(tx, actor);

  if (body.stage === 'preview') {
    const result = await extractKnowledge(
      body.input,
      brain.entities.map((e) => ({ name: e.name, entityType: e.entityType })),
    );
    const proposal = result.extraction.memories[0] || {
      title: body.input.slice(0, 80),
      description: body.input,
      memoryType: body.memoryType || 'experience',
      confidence: 0.8,
      relatedEntities: [],
      attributes: {},
      validFrom: null,
      validUntil: null,
      excerpt: body.input,
    };
    return {
      proposal: { ...proposal, ...(body.memoryType ? { memoryType: body.memoryType } : {}) },
      mode: result.mode,
    };
  }

  // Confirm or single-stage submission
  const proposal = body.proposal || {
    title: body.input.slice(0, 80),
    description: body.input,
    memoryType: body.memoryType || 'experience',
    confidence: 0.8,
    relatedEntities: [],
    attributes: {},
    validFrom: null,
    validUntil: null,
    excerpt: body.input,
  };

  const content = `Employee contribution\n\nOriginal context:\n${body.input}\n\nConfirmed memory:\n${proposal.title}\n${proposal.description}`;
  const hash = contentHash(actor.userId + body.accessPolicy + content);

  const [source] = await tx
    .insert(s.sources)
    .values({
      organizationId: actor.organizationId,
      title: proposal.title,
      sourceType: 'manual',
      mimeType: 'text/plain',
      content,
      uploadedBy: actor.userId,
      accessPolicy: body.accessPolicy,
      status: 'completed',
      metadata: { employeeAttribution: actor.userId, contentHash: hash },
    })
    .returning();

  const extraction = extractionSchema.parse({
    entities: [],
    relationships: [],
    memories: [{ ...proposal, excerpt: proposal.description, confidence: Math.min(proposal.confidence, 0.7) }],
  });

  await persistExtraction(
    tx,
    actor,
    source,
    extraction,
    new DocumentProcessor().chunkContent(content),
    [],
    'employee-confirmed',
  );
  await audit(tx, actor, 'knowledge_taught', source.id);

  const [evidence] = await tx.select().from(s.memoryEvidence).where(eq(s.memoryEvidence.sourceId, source.id));
  return { sourceId: source.id, memoryId: evidence?.memoryId, duplicate: false };
});

export const uploadSource = api(async (request, actor, tx) => {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'Choose a file to upload');

  const max = Number(process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024;
  if (file.size === 0 || file.size > max) {
    throw new HttpError(400, `File must contain data and be smaller than ${max / 1024 / 1024} MB`);
  }

  const extension = path.extname(file.name).toLowerCase();
  const types: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  if (!types[extension]) throw new HttpError(400, 'Supported formats: PDF, DOCX, TXT, Markdown and CSV');

  const policy = z.enum(['organization', 'private', 'restricted']).parse(form.get('accessPolicy') || 'organization');
  const allowedRoles = z.array(z.enum(roles)).parse(JSON.parse(String(form.get('allowedRoles') || '[]')));
  if (policy === 'restricted' && !allowedRoles.length) throw new HttpError(400, 'Choose at least one allowed role');

  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = contentHash(Buffer.concat([Buffer.from(JSON.stringify({ policy, roles: [...allowedRoles].sort() })), bytes]));

  const sourceId = randomUUID();
  const directory = path.resolve(process.env.UPLOAD_DIR || './uploads', actor.organizationId);
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, sourceId + extension);
  await writeFile(filePath, bytes);

  // Read content text
  let content = '';
  try {
    const processor = new DocumentProcessor();
    const extracted = await processor.extractContent(filePath, types[extension]);
    content = extracted.content;
  } catch {
    content = bytes.toString('utf-8').slice(0, 50000);
  }

  const [newSource] = await tx
    .insert(s.sources)
    .values({
      id: sourceId,
      organizationId: actor.organizationId,
      title: path.basename(file.name).slice(0, 500),
      sourceType: 'document',
      mimeType: types[extension],
      fileSize: file.size,
      filePath,
      content,
      uploadedBy: actor.userId,
      accessPolicy: policy,
      allowedRoles,
      status: 'completed',
      metadata: { contentHash: hash },
    })
    .returning();

  // Ingest chunks and memories directly
  if (content.trim()) {
    const processor = new DocumentProcessor();
    const chunks = processor.chunkContent(content);
    const known = (await loadBrain(tx, actor)).entities.map((e) => ({ name: e.name, entityType: e.entityType }));
    const knowledge = await extractKnowledge(content.slice(0, 10000), known);
    const embeddings = await ai.generateEmbeddings(chunks.map((c) => c.content));
    await persistExtraction(tx, actor, newSource, knowledge.extraction, chunks, embeddings, knowledge.mode);
  }

  await audit(tx, actor, 'source_uploaded', sourceId, { policy, size: file.size });
  return { sourceId, status: 'completed', duplicate: false };
});

export const sourceDetail = api(async (request, actor, tx) => {
  const id = z.string().uuid().parse(request.nextUrl.pathname.split('/').pop());
  const brain = await loadBrain(tx, actor);
  const source = brain.sources.find((s) => s.id === id);
  if (!source) throw new HttpError(404, 'Source not found');

  const jobs = await tx
    .select()
    .from(s.ingestionJobs)
    .where(and(eq(s.ingestionJobs.organizationId, actor.organizationId), eq(s.ingestionJobs.sourceId, id)))
    .orderBy(desc(s.ingestionJobs.createdAt));

  return {
    ...publicSource(source),
    chunks: brain.chunks.filter((c) => c.sourceId === id).map(({ embedding, ...c }) => c),
    memories: brain.memories.filter((m) => m.evidence.some((e) => e.sourceId === id)).map(publicMemory),
    jobs,
  };
});

export const updateSource = api(async (request, actor, tx) => {
  const id = z.string().uuid().parse(request.nextUrl.pathname.split('/').pop());
  const body = z
    .object({
      action: z.enum(['retry', 'permissions']),
      accessPolicy: z.enum(['organization', 'private', 'restricted']).optional(),
      allowedRoles: z.array(z.enum(roles)).default([]),
    })
    .parse(await request.json());

  const source = (await loadBrain(tx, actor)).sources.find((s) => s.id === id);
  if (!source || (source.uploadedBy !== actor.userId && !hasRole(actor.role, 'admin'))) {
    throw new HttpError(404, 'Source not found or not manageable');
  }

  if (body.action === 'permissions') {
    if (!body.accessPolicy) throw new HttpError(400, 'Choose an access policy');
    await tx
      .update(s.sources)
      .set({ accessPolicy: body.accessPolicy, allowedRoles: body.allowedRoles, updatedAt: new Date() })
      .where(eq(s.sources.id, id));
    await audit(tx, actor, 'source_permissions_changed', id, { accessPolicy: body.accessPolicy });
    return { updated: true };
  }

  await tx.update(s.sources).set({ status: 'pending' }).where(eq(s.sources.id, id));
  return { status: 'queued' };
});

export const deleteSource = api(async (request, actor, tx) => {
  const id = z.string().uuid().parse(request.nextUrl.pathname.split('/').pop());
  const brain = await loadBrain(tx, actor);
  const source = brain.sources.find((s) => s.id === id);
  if (!source || (source.uploadedBy !== actor.userId && !hasRole(actor.role, 'admin'))) {
    throw new HttpError(404, 'Source not found or not manageable');
  }

  const dependent = await tx.select({ id: s.memoryEvidence.memoryId }).from(s.memoryEvidence).where(eq(s.memoryEvidence.sourceId, id));
  for (const memory of dependent) {
    await tx
      .update(s.memories)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(s.memories.id, memory.id), eq(s.memories.organizationId, actor.organizationId)));
  }

  await tx.update(s.sources).set({ status: 'deleted', updatedAt: new Date() }).where(eq(s.sources.id, id));
  await audit(tx, actor, 'source_deleted', id, { affectedMemories: dependent.length });
  return { deleted: true };
});

export const entityDetail = api(async (request, actor, tx) => {
  const id = z.string().uuid().parse(request.nextUrl.pathname.split('/').pop());
  const brain = await loadBrain(tx, actor);
  const entity = brain.entities.find((e) => e.id === id);
  if (!entity) throw new HttpError(404, 'Entity not found');

  return {
    ...entity,
    memories: brain.memories
      .filter((m) => m.relatedEntityIds?.includes(id) || m.subjectEntityId === id)
      .map(publicMemory),
    relationships: brain.relationships.filter((r) => r.sourceEntityId === id || r.targetEntityId === id),
    events: brain.events.filter((e) => e.entityId === id),
  };
});

export const memoryDetail = api(async (request, actor, tx) => {
  const id = z.string().uuid().parse(request.nextUrl.pathname.split('/').pop());
  const memory = (await loadBrain(tx, actor)).memories.find((m) => m.id === id);
  if (!memory) throw new HttpError(404, 'Memory not found');

  return {
    ...publicMemory(memory),
    versions: await tx.select().from(s.memoryVersions).where(eq(s.memoryVersions.memoryId, id)).orderBy(desc(s.memoryVersions.version)),
  };
});

export const updateMemory = api(async (request, actor, tx) => {
  requireMinimumRole(actor, 'employee');
  const id = z.string().uuid().parse(request.nextUrl.pathname.split('/').pop());
  const body = z
    .object({
      verificationStatus: z.enum(['verified', 'supported', 'disputed', 'unverified']).optional(),
      status: z.enum(['active', 'archived']).optional(),
    })
    .parse(await request.json());

  const memory = (await loadBrain(tx, actor)).memories.find((m) => m.id === id);
  if (!memory) throw new HttpError(404, 'Memory not found');

  const [updated] = await tx
    .update(s.memories)
    .set({ ...body, version: sql`${s.memories.version}+1`, updatedAt: new Date() })
    .where(and(eq(s.memories.id, id), eq(s.memories.organizationId, actor.organizationId)))
    .returning();

  await recordVersion(tx, updated, actor.userId, 'Human review and verification');
  await audit(tx, actor, 'memory_reviewed', id, body);
  return { updated: true };
});

export const getConversations = api(async (_, actor, tx) => {
  const convs = await tx.query.conversations.findMany({
    where: and(eq(s.conversations.organizationId, actor.organizationId), eq(s.conversations.userId, actor.userId)),
    with: { messages: true },
    orderBy: [desc(s.conversations.updatedAt)],
    limit: 30,
  });

  return convs.map((c) => ({
    ...c,
    messages: c.messages.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)),
  }));
});

export const postFeedback = api(async (request, actor, tx) => {
  const body = z.object({ messageId: z.string().uuid(), helpful: z.boolean() }).parse(await request.json());
  await tx
    .update(s.messages)
    .set({
      metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{feedback}', ${body.helpful ? '"Helpful"' : '"Flagged for review"'}::jsonb)`,
    })
    .where(eq(s.messages.id, body.messageId));

  await audit(tx, actor, 'answer_feedback', body.messageId, { helpful: body.helpful });
  return { saved: true };
});
