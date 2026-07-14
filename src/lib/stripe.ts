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
import type { BillingKey } from './plans';

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
