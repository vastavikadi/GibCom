import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

export async function logAudit(params: {
  organizationId: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      organizationId: params.organizationId,
      userId: params.userId || null,
      action: params.action,
      resourceType: params.resourceType || null,
      resourceId: params.resourceId || null,
      details: params.details || {},
      ipAddress: params.ipAddress || null,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

export async function getAuditLogs(
  organizationId: string,
  filters?: {
    action?: string;
    userId?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  },
) {
  const conditions = [eq(auditLogs.organizationId, organizationId)];

  if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters?.resourceType) conditions.push(eq(auditLogs.resourceType, filters.resourceType));
  if (filters?.startDate) conditions.push(gte(auditLogs.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(auditLogs.createdAt, filters.endDate));

  const results = await db.query.auditLogs.findMany({
    where: and(...conditions),
    orderBy: [desc(auditLogs.createdAt)],
    limit: filters?.limit || 50,
    offset: filters?.offset || 0,
    with: { user: true },
  });

  return results;
}

