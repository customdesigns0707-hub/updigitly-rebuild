/**
 * POST /api/stripe/webhook — the payment source of truth (Decision #4 rev).
 *
 * NEVER trust the browser success page as proof of payment. This verified,
 * signed webhook is what activates an enrollment. It:
 *   1. verifies Stripe's signature against the raw body;
 *   2. records the Stripe event id and ignores duplicates (idempotent);
 *   3. matches the event to exactly one enrollment (client_reference_id);
 *   4. marks payment confirmed + opens the 6-month term window;
 *   5. best-effort syncs GHL (tag client-paid → onboarding workflow);
 *   6. returns quickly; GHL failures retry separately via the cron worker.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { stripe as stripeEnv } from '@/lib/env';
import { recordStripePayment } from '@/lib/repo';
import { syncEnrollment } from '@/lib/ghl/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function customerId(c: Stripe.Checkout.Session['customer']): string | null {
  return typeof c === 'string' ? c : c?.id ?? null;
}
function subscriptionId(s: Stripe.Checkout.Session['subscription']): string | null {
  return typeof s === 'string' ? s : s?.id ?? null;
}

export async function POST(req: NextRequest) {
  if (!stripeConfigured || !stripeEnv.webhookSecret) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });

  const body = await req.text(); // RAW body required for signature verification
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, stripeEnv.webhookSecret);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return NextResponse.json({ received: true, ignored: 'session_not_paid' });
      }
      const secureId = session.client_reference_id;
      if (!secureId) {
        console.error('[stripe webhook] session missing client_reference_id:', session.id);
        return NextResponse.json({ received: true, ignored: 'no_reference' });
      }

      const result = await recordStripePayment({
        eventId: event.id,
        eventType: event.type,
        secureId,
        stripeCustomerId: customerId(session.customer),
        stripeSubscriptionId: subscriptionId(session.subscription),
        stripeCheckoutSessionId: session.id,
        priceVersion: session.metadata?.price_version ?? stripeEnv.priceVersion,
        payload: { eventId: event.id, type: event.type, session: session.id },
      });

      if (!result.ok) {
        // Fundamentally unmatchable — ack with 200 so Stripe stops retrying; a
        // reconciliation job surfaces orphaned payments separately.
        console.error('[stripe webhook] no enrollment for reference', secureId, session.id);
        return NextResponse.json({ received: true, unmatched: true });
      }

      // First application only: push the paid stage to GHL (idempotent worker
      // retries on failure via cron, so a deferral here is safe).
      if (result.outcome === 'applied') {
        try {
          await syncEnrollment(result.enrollment.id);
        } catch (err) {
          console.error('[stripe webhook] GHL sync deferred (cron will retry):', err);
        }
      }
      return NextResponse.json({ received: true, outcome: result.outcome });
    }

    // Narrowly subscribed; other event types are acknowledged. (Expand later:
    // invoice.payment_failed, customer.subscription.deleted, etc.)
    return NextResponse.json({ received: true, ignored: event.type });
  } catch (err) {
    console.error('[stripe webhook] handler error:', err);
    // 500 → Stripe retries. Reprocessing is idempotent, so retry is safe.
    return NextResponse.json({ error: 'handler_error' }, { status: 500 });
  }
}
