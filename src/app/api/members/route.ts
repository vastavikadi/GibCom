import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users, memberships, organizations, entities } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { logAudit } from '@/lib/permissions/audit';

export async function GET() {
  try {
    const { organizationId } = await requireAuth();

    const orgMemberships = await db.query.memberships.findMany({
      where: eq(memberships.organizationId, organizationId),
      with: { user: true },
    });

    const personEntities = await db.query.entities.findMany({
      where: and(
        eq(entities.organizationId, organizationId),
        eq(entities.entityType, 'person')
      ),
    });

    const data = orgMemberships.map((m) => {
      const person = personEntities.find(
        (p) => p.name.toLowerCase() === m.user.name.toLowerCase()
      );
      const attrs = (person?.attributes || {}) as Record<string, unknown>;

      return {
        id: m.user.id,
        membershipId: m.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        department: (attrs.department as string) || (m.role === 'owner' ? 'Leadership' : 'General'),
        expertise: (attrs.expertise as string[]) || [],
        avatarUrl: m.user.avatarUrl,
        createdAt: m.createdAt,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch members';
    return NextResponse.json({ success: false, error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireRole('admin');
    const { organizationId, user: currentUser } = ctx;

    const body = await req.json();
    const { name, email, role = 'employee', department, expertise = [] } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    // Check if user already exists
    let existingUser = await db.query.users.findFirst({
      where: eq(users.email, trimmedEmail),
    });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash('password123', 10);
      const [newUser] = await db
        .insert(users)
        .values({
          name: trimmedName,
          email: trimmedEmail,
          passwordHash,
          role: role === 'owner' ? 'admin' : role,
        })
        .returning();
      existingUser = newUser;
    }

    // Check if already in this organization
    const existingMembership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, existingUser.id),
        eq(memberships.organizationId, organizationId)
      ),
    });

    if (existingMembership) {
      // Update role if changed
      await db
        .update(memberships)
        .set({ role, updatedAt: new Date() })
        .where(eq(memberships.id, existingMembership.id));
    } else {
      await db.insert(memberships).values({
        userId: existingUser.id,
        organizationId,
        role: role === 'owner' ? 'admin' : role,
      });
    }

    // Create or update Person entity in knowledge graph
    const existingPerson = await db.query.entities.findFirst({
      where: and(
        eq(entities.organizationId, organizationId),
        eq(entities.entityType, 'person'),
        eq(entities.name, trimmedName)
      ),
    });

    if (!existingPerson) {
      await db.insert(entities).values({
        organizationId,
        entityType: 'person',
        name: trimmedName,
        description: `${trimmedName} (${role}) in ${department || 'General'}.`,
        attributes: {
          role,
          department: department || 'General',
          expertise: Array.isArray(expertise) ? expertise : [],
        },
      });
    }

    await logAudit({
      organizationId,
      userId: currentUser.id,
      action: 'invite_member',
      details: {
        targetEmail: trimmedEmail,
        targetRole: role,
        addedBy: currentUser.email,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: existingUser.id,
        name: trimmedName,
        email: trimmedEmail,
        role,
        department: department || 'General',
      },
      message: `Member ${trimmedName} successfully added to the organization.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to add member';
    return NextResponse.json({ success: false, error: msg }, { status: msg === 'Unauthorized' ? 401 : 500 });
  }
}

