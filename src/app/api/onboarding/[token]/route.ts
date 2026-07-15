/**
 * POST /api/onboarding/[token] — save-in-progress or submit onboarding answers.
 *
 * Body: { answers: Partial<OnboardingAnswers>, submit?: boolean }
 *  - submit falsy  → draft save. Lenient (partial) validation, jsonb-merged into
 *    the existing answers so nothing already saved is lost. Flips
 *    not_started → in_progress on the first save.
 *  - submit true   → full validation, then `submitOnboarding` — this is the
 *    event that starts the 7-day fit-review clock (Decision #2). Best-effort
 *    GHL sync after, same pattern as /api/enroll: never fails the visitor's
 *    request, the stage event stays pending for the cron on a GHL outage.
 *
 * [token] is the onboarding row's own secure token (distinct from the
 * enrollment secure id) — unguessable, so no separate bot check is applied
 * here (Decision #4's Turnstile gate covers the public qualifier/contact forms,
 * where the URL itself isn't a secret).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { onboardingAnswersSchema, onboardingDraftSchema } from '@/lib/onboarding';
import { saveOnboardingAnswers, submitOnboarding } from '@/lib/repo';
import { syncEnrollment } from '@/lib/ghl/sync';
import { dbConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: 'not_configured', detail: 'Enrollment store (DATABASE_URL) is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { answers, submit } = (body ?? {}) as { answers?: unknown; submit?: boolean };

  if (!submit) {
    const parsed = onboardingDraftSchema.safeParse(answers ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation', issues: parsed.error.flatten() }, { status: 422 });
    }
    const result = await saveOnboardingAnswers(params.token, parsed.data);
    if (!result.ok) {
      const status = result.reason === 'not_found' ? 404 : 409;
      return NextResponse.json({ error: result.reason }, { status });
    }
    return NextResponse.json({ ok: true, status: result.onboarding.status });
  }

  const parsed = onboardingAnswersSchema.safeParse(answers);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', issues: parsed.error.flatten() }, { status: 422 });
  }

  const result = await submitOnboarding(params.token, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 404 });
  }

  try {
    await syncEnrollment(result.onboarding.enrollmentId);
  } catch (err) {
    console.error('[onboarding] GHL sync deferred (will retry via cron):', err);
  }

  return NextResponse.json({
    ok: true,
    alreadySubmitted: result.alreadySubmitted,
    fitReviewDueAt: result.onboarding.fitReviewDueAt,
  });
}
