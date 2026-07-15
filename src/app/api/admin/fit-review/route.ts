/**
 * POST /api/admin/fit-review — flip the human fit-review decision (Decision #2:
 * internal, qualitative call — never automated). SYNC_SECRET-gated, same
 * `authorized()` pattern as /api/admin/stripe-seed (dev-open only when the
 * secret is unset, i.e. never in production).
 *
 * Body: { enrollmentSecureId?: string, onboardingToken?: string, status: FitReviewStatus }
 * Provide exactly one identifier — whichever the operator has on hand.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { sync as syncEnv, isDev } from '@/lib/env';
import { setFitReviewStatus, type FitReviewStatus } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  if (!syncEnv.secret) return isDev;
  const header = req.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const q = req.nextUrl.searchParams.get('secret');
  return bearer === syncEnv.secret || q === syncEnv.secret;
}

const VALID_STATUSES: FitReviewStatus[] = ['pending', 'cleared', 'flagged', 'resolved'];

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { enrollmentSecureId, onboardingToken, status } = (body ?? {}) as {
    enrollmentSecureId?: string;
    onboardingToken?: string;
    status?: string;
  };

  if (!status || !VALID_STATUSES.includes(status as FitReviewStatus)) {
    return NextResponse.json({ error: 'invalid_status', valid: VALID_STATUSES }, { status: 422 });
  }
  if (!enrollmentSecureId && !onboardingToken) {
    return NextResponse.json({ error: 'missing_identifier' }, { status: 422 });
  }

  const onboarding = await setFitReviewStatus(
    { enrollmentSecureId, onboardingToken },
    status as FitReviewStatus,
  );
  if (!onboarding) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ ok: true, onboarding });
}
