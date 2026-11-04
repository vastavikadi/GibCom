import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { detectOrganizationalContradictions } from '@/lib/intelligence/contradictions';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await requireAuth();
    const contradictions = await detectOrganizationalContradictions(organizationId);

    return NextResponse.json({
      success: true,
      data: contradictions,
      count: contradictions.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to detect contradictions';
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === 'Unauthorized' ? 401 : 500 }
    );
  }
}

