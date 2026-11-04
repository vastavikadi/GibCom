import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { organizationId, membership } = await requireAuth();

    // Check permissions: manager, admin, or owner
    const roleHierarchy = ['employee', 'manager', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(membership.role);
    if (userRoleIndex < roleHierarchy.indexOf('manager')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Manager role or above required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const actionFilter = searchParams.get('action');
    const resourceTypeFilter = searchParams.get('resourceType');

    const conditions = [eq(auditLogs.organizationId, organizationId)];
    if (actionFilter) {
      conditions.push(eq(auditLogs.action, actionFilter));
    }
    if (resourceTypeFilter) {
      conditions.push(eq(auditLogs.resourceType, resourceTypeFilter));
    }

    const logs = await db.query.auditLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
        user: log.user
          ? { id: log.user.id, name: log.user.name, email: log.user.email }
          : { id: null, name: 'System / Service Account', email: 'system' },
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === 'Unauthorized' ? 401 : 500 }
    );
  }
}

