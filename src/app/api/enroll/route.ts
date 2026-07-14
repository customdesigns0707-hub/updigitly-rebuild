/**
 * POST /api/enroll — qualifier submission.
 *
 * Flow (Decision #4): Turnstile → Zod validate → PERSIST to Postgres (must
 * succeed; this is canonical) → best-effort GHL sync (never blocks the visitor's
 * success; a GHL outage leaves the enrollment safely saved and the stage event
 * pending for the cron). Returns the secure-id the client redirects to.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { enrollSubmitSchema } from '@/lib/enrollment';
import { verifyTurnstile } from '@/lib/turnstile';
import { createEnrollment } from '@/lib/repo';
import { syncEnrollment } from '@/lib/ghl/sync';
import { clientIp } from '@/lib/request';
import { dbConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = enrollSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const data = parsed.data;

  const ip = clientIp(req);
  const bot = await verifyTurnstile(data.turnstileToken, ip);
  if (!bot.ok) {
    return NextResponse.json({ error: 'turnstile', reason: bot.reason }, { status: 400 });
  }

  if (!dbConfigured) {
    return NextResponse.json(
      { error: 'not_configured', detail: 'Enrollment store (DATABASE_URL) is not configured.' },
      { status: 503 },
    );
  }

  let enrollment;
  try {
    enrollment = await createEnrollment({
      plan: data.plan,
      billing: data.billing,
      contactName: data.contactName,
      businessName: data.businessName,
      email: data.email,
      phone: data.phone,
      answers: data.answers,
      anythingElse: data.anythingElse,
    });
  } catch (err) {
    console.error('[enroll] persist failed', err);
    // Surface the underlying reason in non-production so it's visible in the
    // Network tab while diagnosing DB connectivity. Never included in
    // production builds — production only ever gets the generic error code.
    const detail =
      process.env.NODE_ENV !== 'production'
        ? err instanceof Error
          ? err.message
          : String(err)
        : undefined;
    return NextResponse.json({ error: 'persist_failed', detail }, { status: 500 });
  }

  // Best-effort CRM sync. Failure must NOT fail the request — the enrollment is
  // saved and the stage event stays pending for the /api/sync cron to reconcile.
  try {
    await syncEnrollment(enrollment.id);
  } catch (err) {
    console.error('[enroll] GHL sync deferred (will retry via cron):', err);
  }

  return NextResponse.json({ secureId: enrollment.secureId }, { status: 201 });
}
