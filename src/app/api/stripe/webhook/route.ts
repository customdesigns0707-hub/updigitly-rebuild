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
import { getStripe, stripeConfigured, ensureFixedTermCancel } from '@/lib/stripe';
import { stripe as stripeEnv } from '@/lib/env';
import {
  recordStripePayment,
  recordSubscriptionCancelled,
  recordPaymentFailed,
  recordSubscriptionCancelAt,
} from '@/lib/repo';
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

      // Enforce the interim fixed term (NO auto-renewal): cap the subscription
      // with cancel_at so billing stops at the end of the final paid period.
      // Attempted on EVERY completed-session delivery (applied/already_paid/
      // duplicate) so it self-heals — and is intentionally NOT caught: if it
      // fails, the outer catch returns 500 and Stripe retries until it sticks.
      // recordStripePayment is idempotent, so retries are safe. The
      // reconciliation report also surfaces any paid subscription still missing
      // its cap, as a backstop.
      const subId = subscriptionId(session.subscription);
      if (subId) {
        const ft = await ensureFixedTermCancel(subId, result.enrollment.billingKey);
        await recordSubscriptionCancelAt(result.enrollment.id, ft.cancelAt);
      }

      return NextResponse.json({ received: true, outcome: result.outcome });
    }

    // customer.subscription.deleted — the initial term ended or the client
    // cancelled (whether from Stripe's side, the Customer Portal, or our own
    // dashboard). Marks the enrollment cancelled so GHL segmentation stays
    // accurate (Chat 4 hardening — the webhook previously only knew about the
    // initial payment).
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const result = await recordSubscriptionCancelled({
        eventId: event.id,
        eventType: event.type,
        stripeSubscriptionId: sub.id,
        payload: { eventId: event.id, type: event.type, subscription: sub.id },
      });
      if (!result.ok) {
        console.error('[stripe webhook] no enrollment for subscription', sub.id);
        return NextResponse.json({ received: true, unmatched: true });
      }
      if (result.outcome === 'applied') {
        try {
          await syncEnrollment(result.enrollment.id);
        } catch (err) {
          console.error('[stripe webhook] GHL sync deferred (cron will retry):', err);
        }
      }
      return NextResponse.json({ received: true, outcome: result.outcome });
    }

    // invoice.payment_failed — a renewal charge bounced. Visibility only (see
    // repo.ts recordPaymentFailed) — Stripe's own retry/dunning schedule
    // governs whether the subscription recovers or eventually gets cancelled
    // (which arrives separately as customer.subscription.deleted above).
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      // Stripe moved `invoice.subscription` under `invoice.parent.subscription_details`
      // in newer API versions — check both shapes so this works regardless of
      // which API version this Stripe account is pinned to.
      const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
      const nested = (
        invoice as unknown as {
          parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
        }
      ).parent?.subscription_details?.subscription;
      const subField = legacy ?? nested;
      const subId = typeof subField === 'string' ? subField : subField?.id ?? null;
      if (!subId) {
        return NextResponse.json({ received: true, ignored: 'no_subscription' });
      }
      const result = await recordPaymentFailed({
        eventId: event.id,
        eventType: event.type,
        stripeSubscriptionId: subId,
        payload: { eventId: event.id, type: event.type, invoice: invoice.id },
      });
      if (!result.ok) {
        console.error('[stripe webhook] no enrollment for subscription', subId);
        return NextResponse.json({ received: true, unmatched: true });
      }
      if (result.outcome === 'applied') {
        try {
          await syncEnrollment(result.enrollment.id);
        } catch (err) {
          console.error('[stripe webhook] GHL sync deferred (cron will retry):', err);
        }
      }
      return NextResponse.json({ received: true, outcome: result.outcome });
    }

    // Everything else is acknowledged but ignored.
    return NextResponse.json({ received: true, ignored: event.type });
  } catch (err) {
    console.error('[stripe webhook] handler error:', err);
    // 500 → Stripe retries. Reprocessing is idempotent, so retry is safe.
    return NextResponse.json({ error: 'handler_error' }, { status: 500 });
  }
}
