import { db } from '@/lib/db';
import { memberships, sources, memories, memoryEvidence, auditLogs } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface EffectivePermissions {
  role: string;
  canManageUsers: boolean;
  canManageSources: boolean;
  canVerifyMemories: boolean;
  canApproveActions: boolean;
  canViewAuditLogs: boolean;
  canManageSettings: boolean;
}

const ROLE_HIERARCHY = ['employee', 'manager', 'admin', 'owner'];

export class PermissionEngine {
  async canAccessSource(userId: string, organizationId: string, sourceId: string): Promise<boolean> {
    const source = await db.query.sources.findFirst({
      where: and(eq(sources.id, sourceId), eq(sources.organizationId, organizationId)),
    });
    if (!source) return false;

    const membership = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)),
    });
    if (!membership) return false;

    switch (source.accessPolicy) {
      case 'organization':
        return true;
      case 'private':
        return source.uploadedBy === userId;
      case 'restricted':
        if (source.allowedUserIds?.includes(userId)) return true;
        if (source.allowedRoles?.includes(membership.role)) return true;
        return ROLE_HIERARCHY.indexOf(membership.role) >= ROLE_HIERARCHY.indexOf('admin');
      default:
        return true;
    }
  }

  async canAccessMemory(userId: string, organizationId: string, memoryId: string): Promise<boolean> {
    const memory = await db.query.memories.findFirst({
      where: and(eq(memories.id, memoryId), eq(memories.organizationId, organizationId)),
    });
    if (!memory) return false;

    if (memory.accessPolicy === 'inherit_source') {
      const evidence = await db.query.memoryEvidence.findMany({
        where: eq(memoryEvidence.memoryId, memoryId),
      });
      if (evidence.length === 0) return true;
      for (const e of evidence) {
        if (e.sourceId) {
          const canAccess = await this.canAccessSource(userId, organizationId, e.sourceId);
          if (!canAccess) return false;
        }
      }
      return true;
    }

    return true;
  }

  async filterByPermissions<T extends { id: string }>(
    userId: string,
    organizationId: string,
    items: T[],
    resourceType: 'source' | 'memory',
  ): Promise<T[]> {
    const results: T[] = [];
    for (const item of items) {
      const canAccess =
        resourceType === 'source'
          ? await this.canAccessSource(userId, organizationId, item.id)
          : await this.canAccessMemory(userId, organizationId, item.id);
      if (canAccess) results.push(item);
    }
    return results;
  }

  async hasRole(userId: string, organizationId: string, requiredRole: string): Promise<boolean> {
    const membership = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)),
    });
    if (!membership) return false;
    return ROLE_HIERARCHY.indexOf(membership.role) >= ROLE_HIERARCHY.indexOf(requiredRole);
  }

  async getEffectivePermissions(userId: string, organizationId: string): Promise<EffectivePermissions> {
    const membership = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)),
    });

    const role = membership?.role || 'employee';
    const roleIdx = ROLE_HIERARCHY.indexOf(role);

    return {
      role,
      canManageUsers: roleIdx >= ROLE_HIERARCHY.indexOf('admin'),
      canManageSources: roleIdx >= ROLE_HIERARCHY.indexOf('manager'),
      canVerifyMemories: roleIdx >= ROLE_HIERARCHY.indexOf('manager'),
      canApproveActions: roleIdx >= ROLE_HIERARCHY.indexOf('manager'),
      canViewAuditLogs: roleIdx >= ROLE_HIERARCHY.indexOf('admin'),
      canManageSettings: roleIdx >= ROLE_HIERARCHY.indexOf('owner'),
    };
  }
}

export const permissions = new PermissionEngine();

