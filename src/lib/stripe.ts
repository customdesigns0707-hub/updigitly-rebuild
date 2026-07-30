/**
 * Stripe client + the plan/term → price resolution the enrollment flow needs.
 * Server-only. Stripe is the AUTHORITATIVE billing system (Decision #4 rev
 * 2026-07-14): our site creates a Checkout Session, Stripe hosts payment, and a
 * signed webhook is the source of truth. GHL is updated downstream as CRM only.
 *
 * The browser NEVER sends a price. It submits only an approved internal
 * plan+term (derived from the enrollment's stored plan + chosen billing), and
 * the server maps that to a Stripe price via a stable `lookup_key`. Prices are
 * created/seeded with these lookup keys (see /api/admin/stripe-seed), so price
 * IDs are never hard-coded and can rotate without a code change.
 */
import 'server-only';
import Stripe from 'stripe';
import { stripe as stripeEnv } from './env';
import type { EnrollablePlanKey } from './enrollment';
import { fixedTermMonths, type BillingKey } from './plans';

let _client: Stripe | null = null;

/** Lazily-created Stripe client. Throws only when first USED without a key, so
 *  the module is safe to import during build with no credentials present. */
export function getStripe(): Stripe {
  if (!stripeEnv.secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add the Stripe secret key to .env.local / Vercel — ' +
        'the enrollment checkout cannot run without it.',
    );
  }
  if (!_client) {
    _client = new Stripe(stripeEnv.secretKey, {
      appInfo: { name: 'updigitly-enrollment', version: '2.0.0' },
    });
  }
  return _client;
}

export const stripeConfigured = stripeEnv.isConfigured;

/**
 * The ONLY mapping from an internal plan+term to Stripe. Each value is a Stripe
 * price `lookup_key`. Six distinct prices, one per plan×term (Decision #2 v4).
 * Keep these strings in lockstep with the seed route + the Stripe prices.
 */
export const PLAN_TERM_LOOKUP: Record<EnrollablePlanKey, Record<BillingKey, string>> = {
  essential: {
    monthly: 'essential_monthly',
    sixPrepaid: 'essential_six_month',
    annualPrepaid: 'essential_annual',
  },
  'growth-engine': {
    monthly: 'growth_monthly',
    sixPrepaid: 'growth_six_month',
    annualPrepaid: 'growth_annual',
  },
};

export function lookupKeyFor(plan: EnrollablePlanKey, billing: BillingKey): string {
  return PLAN_TERM_LOOKUP[plan][billing];
}

/** Reverse of PLAN_TERM_LOOKUP: lookup_key -> plan+billing. Built once at
 *  module load — same six entries, just the other direction. */
const PLAN_BY_LOOKUP_KEY: Record<string, { planKey: EnrollablePlanKey; billingKey: BillingKey }> =
  Object.fromEntries(
    Object.entries(PLAN_TERM_LOOKUP).flatMap(([planKey, byBilling]) =>
      Object.entries(byBilling).map(([billingKey, lookupKey]) => [
        lookupKey,
        { planKey: planKey as EnrollablePlanKey, billingKey: billingKey as BillingKey },
      ]),
    ),
  );

/**
 * Resolve a Stripe price's lookup_key back to our internal plan+billing key.
 * Returns null for any price we don't recognize (ad-hoc/manually-created
 * prices, a lookup_key typo, a price from a different Stripe account) — the
 * caller must treat null as "flag it," never guess at a plan (Decision:
 * customer.subscription.updated sync, 2026-07-30).
 */
export function recognizePlanForLookupKey(
  lookupKey: string | null | undefined,
): { planKey: EnrollablePlanKey; billingKey: BillingKey } | null {
  if (!lookupKey) return null;
  return PLAN_BY_LOOKUP_KEY[lookupKey] ?? null;
}

/**
 * Resolve the live Stripe price id for a plan+term by its lookup_key. Throws if
 * no active price is seeded — the checkout route turns this into a safe "not
 * ready" response rather than ever charging an unknown/incorrect amount.
 */
export async function resolvePriceId(plan: EnrollablePlanKey, billing: BillingKey): Promise<string> {
  const key = lookupKeyFor(plan, billing);
  const stripe = getStripe();
  const prices = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) {
    throw new Error(`No active Stripe price for lookup_key "${key}". Run the price seed first.`);
  }
  return price.id;
}

/** Add N calendar months to a unix (seconds) timestamp; returns a unix-seconds ts.
 *  Calendar-month math matches how Stripe anchors monthly/interval renewals. */
function addMonthsUnix(unixSeconds: number, months: number): number {
  const d = new Date(unixSeconds * 1000);
  d.setMonth(d.getMonth() + months);
  return Math.floor(d.getTime() / 1000);
}

export interface FixedTermResult {
  /** The cancel_at timestamp now set on the subscription. */
  cancelAt: Date;
  /** True if this call set it; false if it was already present (idempotent). */
  applied: boolean;
}

/**
 * Enforce the interim fixed term: cap a subscription with `cancel_at` so billing
 * STOPS at the end of the final paid period (NO automatic renewal). Monthly runs
 * 6 installments; 6-month prepaid runs one 6-month period; annual prepaid one
 * 12-month period — then Stripe cancels, no renewal invoice.
 *
 * Idempotent: if the subscription already has a `cancel_at`, it is left as-is and
 * returned (applied=false). `cancel_at` is a long-stable Subscription parameter
 * (unlike Checkout's `subscription_data`, whose support varies), so setting it on
 * the created subscription is the reliable mechanism. Aligns to the subscription's
 * own start_date so the boundary is exact regardless of when checkout was created.
 */
export async function ensureFixedTermCancel(
  subscriptionId: string,
  billing: BillingKey,
): Promise<FixedTermResult> {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);

  if (sub.cancel_at) {
    return { cancelAt: new Date(sub.cancel_at * 1000), applied: false };
  }

  const months = fixedTermMonths(billing);
  const anchor = sub.start_date ?? Math.floor(Date.now() / 1000);
  const cancelAtUnix = addMonthsUnix(anchor, months);

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at: cancelAtUnix,
    // Do not prorate anything when the fixed term ends — the final period was
    // fully paid; cancel_at just prevents the next renewal.
    proration_behavior: 'none',
  });

  return { cancelAt: new Date(cancelAtUnix * 1000), applied: true };
}
