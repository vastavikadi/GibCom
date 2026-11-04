import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, organizations, memberships } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  organizationName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, data.email),
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
    }

    const userId = uuid();
    const passwordHash = await bcrypt.hash(data.password, 10);

    await db.insert(users).values({
      id: userId,
      email: data.email,
      name: data.name,
      passwordHash,
    });

    // If organization name provided, create org and membership
    if (data.organizationName) {
      const orgId = uuid();
      const slug = data.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      await db.insert(organizations).values({
        id: orgId,
        name: data.organizationName,
        slug,
      });

      await db.insert(memberships).values({
        id: uuid(),
        userId,
        organizationId: orgId,
        role: 'owner',
      });
    }

    return NextResponse.json({
      success: true,
      data: { id: userId, email: data.email, name: data.name },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}

