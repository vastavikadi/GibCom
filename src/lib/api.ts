import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { Actor, hasRole } from '@/lib/domain/contracts';
import { withActor } from '@/lib/db/scoped';
import { Transaction } from '@/lib/db';

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function requireMinimumRole(actor: Actor, role: string) { if (!hasRole(actor.role, role)) throw new HttpError(403, 'Insufficient permissions'); }
export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, { status: 400 });
  if (error instanceof HttpError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : '';
  if (message === 'Unauthorized' || message === 'No organization') return NextResponse.json({ success: false, error: message }, { status: message === 'Unauthorized' ? 401 : 403 });
  console.error('[request failed]', error instanceof Error ? error.name : 'UnknownError');
  return NextResponse.json({ success: false, error: 'The request could not be completed. Check service configuration and try again.' }, { status: 500 });
}
export async function actorFromSession(): Promise<Actor> { const { user, membership, organizationId } = await requireAuth(); return { userId: user.id, organizationId, role: membership.role }; }
export function api(work: (request: NextRequest, actor: Actor, tx: Transaction) => Promise<unknown>) {
  return async (request: NextRequest) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        const origin = request.headers.get('origin');
        if (origin && origin !== request.nextUrl.origin && origin !== process.env.NEXTAUTH_URL) throw new HttpError(403, 'Invalid request origin');
      }
      const actor = await actorFromSession();
      const data = await withActor(actor, tx => work(request, actor, tx));
      return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return errorResponse(error); }
  };
}
