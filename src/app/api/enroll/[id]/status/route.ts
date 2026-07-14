/**
 * GET /api/enroll/[id]/status — lightweight payment-status poll for the
 * confirmation page. The success page is NOT proof of payment; it polls this,
 * which reflects the webhook-confirmed state in Postgres (Decision #4 rev).
 * [id] is the enrollment secure id (the unguessable token).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getEnrollmentBySecureId, getOnboardingByEnrollmentId } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const enrollment = await getEnrollmentBySecureId(params.id);
  if (!enrollment) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const paid = enrollment.status === 'paid';
  let onboardingToken: string | null = null;
  if (paid) {
    const ob = await getOnboardingByEnrollmentId(enrollment.id);
    onboardingToken = ob?.secureToken ?? null;
  }
  return NextResponse.json({ status: enrollment.status, paid, onboardingToken });
}
