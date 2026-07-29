/**
 * POST /api/admin/approve-payment — approve an enrollment for payment (interim
 * launch, 2026-07-28). Checkout is hard-gated on approval: this is how the
 * operator unlocks it.
 *
 * Two paths, one mechanism:
 *   • Cold-call prospect approved live on the call → operator calls this during
 *     the call; the prospect can pay immediately.
 *   • Unassisted inbound enrollment → held until the operator reviews fit and
 *     calls this.
 *
 * SYNC_SECRET-gated, same `authorized()` pattern as /api/admin/fit-review and
 * /api/admin/stripe-seed (dev-open only when the secret is unset, i.e. never in
 * production). Deliberately NOT a dashboard — a single operator-controlled call.
 *
 * Body: { enrollmentSecureId: string, note?: string }
 */
import { NextResponse, type NextRequest } from 'next/server';
import { sync as syncEnv, isDev, siteUrl } from '@/lib/env';
import { approvePayment } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  if (!syncEnv.secret) return isDev;
  const header = req.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const q = req.nextUrl.searchParams.get('secret');
  return bearer === syncEnv.secret || q === syncEnv.secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { enrollmentSecureId, note } = (body ?? {}) as { enrollmentSecureId?: string; note?: string };

  if (!enrollmentSecureId) {
    return NextResponse.json({ error: 'missing_identifier' }, { status: 422 });
  }

  const enrollment = await approvePayment(enrollmentSecureId, note);
  if (!enrollment) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Hand back the review URL so the operator can send/confirm the payment link.
  return NextResponse.json({
    ok: true,
    secureId: enrollment.secureId,
    paymentApproved: enrollment.paymentApproved,
    approvedAt: enrollment.paymentApprovedAt,
    note: enrollment.paymentApprovalNote,
    reviewUrl: `${siteUrl}/enroll/${enrollment.secureId}/review`,
  });
}
