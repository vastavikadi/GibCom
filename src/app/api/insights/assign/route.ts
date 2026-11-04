import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { organizations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/lib/permissions/audit';

export async function POST(req: Request) {
  try {
    const ctx = await requireRole('manager'); // owner, admin, or manager can assign
    const { organizationId, user: currentUser } = ctx;

    const body = await req.json();
    const { insightTitle, memberId, note = '' } = body;

    if (!insightTitle || !memberId) {
      return NextResponse.json(
        { success: false, error: 'insightTitle and memberId are required' },
        { status: 400 }
      );
    }

    const assignedUser = await db.query.users.findFirst({
      where: eq(users.id, memberId),
    });

    if (!assignedUser) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const settings = (org.settings || {}) as Record<string, unknown>;
    const assignments = (settings.insightAssignments || {}) as Record<
      string,
      Array<{
        memberId: string;
        memberName: string;
        role?: string;
        note?: string;
        assignedAt: string;
        assignedBy: string;
      }>
    >;

    const list = assignments[insightTitle] || [];
    // If already assigned, update note, else add
    const existingIndex = list.findIndex((a) => a.memberId === memberId);
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        note: note || list[existingIndex].note,
        assignedAt: new Date().toISOString(),
        assignedBy: currentUser.name,
      };
    } else {
      list.push({
        memberId: assignedUser.id,
        memberName: assignedUser.name,
        role: assignedUser.role || 'employee',
        note,
        assignedAt: new Date().toISOString(),
        assignedBy: currentUser.name,
      });
    }

    assignments[insightTitle] = list;

    await db
      .update(organizations)
      .set({
        settings: { ...settings, insightAssignments: assignments },
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    await logAudit({
      organizationId,
      userId: currentUser.id,
      action: 'assign_insight_member',
      details: {
        insightTitle,
        assignedMember: assignedUser.name,
        assignedBy: currentUser.name,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        insightTitle,
        assignees: list,
      },
      message: `${assignedUser.name} assigned to insight "${insightTitle}".`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Assignment failed';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireRole('manager');
    const { organizationId, user: currentUser } = ctx;

    const body = await req.json();
    const { insightTitle, memberId } = body;

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Org not found' }, { status: 404 });
    }

    const settings = (org.settings || {}) as Record<string, unknown>;
    const assignments = (settings.insightAssignments || {}) as Record<string, Array<{ memberId: string }>>;

    if (assignments[insightTitle]) {
      assignments[insightTitle] = assignments[insightTitle].filter((a) => a.memberId !== memberId);
      await db
        .update(organizations)
        .set({
          settings: { ...settings, insightAssignments: assignments },
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId));
    }

    return NextResponse.json({ success: true, message: 'Member unassigned' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unassign failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

