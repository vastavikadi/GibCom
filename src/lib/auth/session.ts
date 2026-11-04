import { getServerSession } from 'next-auth';
import { authOptions } from './config';
import { db } from '@/lib/db';
import { users, memberships } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.email) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  return user || null;
}

export async function getUserOrganization(userId: string) {
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, userId),
    with: { organization: true },
  });

  return membership || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const membership = await getUserOrganization(user.id);
  if (!membership) throw new Error('No organization');

  return {
    user,
    membership,
    organizationId: membership.organizationId,
  };
}

export async function requireRole(requiredRole: string) {
  const ctx = await requireAuth();

  const roleHierarchy = ['employee', 'manager', 'admin', 'owner'];
  const userRoleIndex = roleHierarchy.indexOf(ctx.membership.role);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  if (userRoleIndex < requiredRoleIndex) {
    throw new Error('Insufficient permissions');
  }

  return ctx;
}

