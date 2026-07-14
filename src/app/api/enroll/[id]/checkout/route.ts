/**
 * POST /api/enroll/[id]/checkout — create the Stripe Checkout Session.
 *
 * Hard gate (Decision #4): only an enrollment whose commitment disclosure has
 * been accepted (evidence frozen) may reach payment. The browser sends NO price;
 * the server resolves the Stripe price from the enrollment's stored plan+term by
 * lookup_key, so an incorrect/unknown amount can never be charged. The session
 * carries the enrollment secure id as `client_reference_id` — the single key the
 * webhook uses to reconcile the payment back to exactly one enrollment.
 *
 * [id] is the enrollment secure id.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getEnrollmentBySecureId, markAwaitingPayment } from '@/lib/repo';
import { getStripe, resolvePriceId, stripeConfigured } from '@/lib/stripe';
import { buildPriceSnapshot } from '@/lib/enrollment';
import { syncEnrollment } from '@/lib/ghl/sync';
import { stripe as stripeEnv, siteUrl } from '@/lib/env';
import { usd } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!stripeConfigured) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const enrollment = await getEnrollmentBySecureId(params.id);
  if (!enrollment) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Gate: disclosure must be accepted first.
  if (enrollment.status === 'qualifier_submitted') {
    return NextResponse.json({ error: 'disclosure_not_accepted' }, { status: 409 });
  }
  // Already paid — hand straight to confirmation (never charge twice).
  if (enrollment.status === 'paid') {
    return NextResponse.json({ url: `${siteUrl}/enroll/confirmation?ref=${enrollment.secureId}` });
  }

  // Best-effort: ensure the GHL contact exists before payment. Never blocks
  // checkout — the reconciliation match is on client_reference_id, not GHL.
  try {
    await syncEnrollment(enrollment.id);
  } catch (err) {
    console.error('[checkout] GHL pre-sync deferred:', err);
  }

  const snapshot = buildPriceSnapshot(enrollment.planKey, enrollment.billingKey);
  const stripe = getStripe();

  let priceId: string;
  try {
    priceId = await resolvePriceId(enrollment.planKey, enrollment.billingKey);
  } catch (err) {
    console.error('[checkout] price resolve failed:', err);
    return NextResponse.json({ error: 'price_unavailable' }, { status: 503 });
  }

  const commitmentLine =
    `${snapshot.planName} · ${snapshot.billingLabel}. ${usd(snapshot.immediateCharge)} charged today · ` +
    `${snapshot.initialTermMonths}-month initial service term (minimum total ${usd(snapshot.minCommitment)}). ` +
    `You reviewed and accepted these terms on the previous step.`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: enrollment.email,
    client_reference_id: enrollment.secureId,
    metadata: {
      enrollment_id: enrollment.id,
      secure_id: enrollment.secureId,
      plan_key: enrollment.planKey,
      billing_key: enrollment.billingKey,
      price_version: stripeEnv.priceVersion,
    },
    subscription_data: {
      metadata: {
        enrollment_id: enrollment.id,
        secure_id: enrollment.secureId,
        plan_key: enrollment.planKey,
        billing_key: enrollment.billingKey,
      },
    },
    custom_text: { submit: { message: commitmentLine } },
    success_url: `${siteUrl}/enroll/confirmation?ref=${enrollment.secureId}`,
    cancel_url: `${siteUrl}/enroll/${enrollment.secureId}/review`,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'session_no_url' }, { status: 502 });
  }

  // Record that checkout was initiated (disclosure_accepted → awaiting_payment).
  await markAwaitingPayment(enrollment.secureId, session.id);

  return NextResponse.json({ url: session.url });
}
