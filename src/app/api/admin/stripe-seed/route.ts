/**
 * GET|POST /api/admin/stripe-seed — one-off, idempotent creation of the six
 * Stripe prices (Essential + Growth Engine × monthly / 6-month prepaid / annual
 * prepaid) that back enrollment, each tagged with a stable `lookup_key` the
 * checkout route resolves at runtime. Amounts are the LOCKED Decision #2 v4
 * numbers in cents. Re-running is safe: an existing price (by lookup_key) is
 * left untouched, so this never duplicates or mutates a live price.
 *
 * Deliberately decoupled from GHL's mirrored products — these are OUR own Stripe
 * objects (metadata app=updigitly-site), so billing is not entangled with GHL's
 * product sync. Guarded by SYNC_SECRET (dev-open when unset). Remove after use.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, stripeConfigured, PLAN_TERM_LOOKUP } from '@/lib/stripe';
import { sync as syncEnv, isDev, stripe as stripeEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  if (!syncEnv.secret) return isDev;
  const header = req.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const q = req.nextUrl.searchParams.get('secret');
  return bearer === syncEnv.secret || q === syncEnv.secret;
}

interface PriceDef {
  lookupKey: string;
  unitAmount: number; // cents
  interval: 'month' | 'year';
  intervalCount: number;
  nickname: string;
}

const PLAN_SEEDS: { planKey: 'essential' | 'growth-engine'; name: string; prices: PriceDef[] }[] = [
  {
    planKey: 'essential',
    name: 'Updigitly Essential',
    prices: [
      { lookupKey: 'essential_monthly', unitAmount: 69700, interval: 'month', intervalCount: 1, nickname: 'Essential — Monthly' },
      { lookupKey: 'essential_six_month', unitAmount: 376380, interval: 'month', intervalCount: 6, nickname: 'Essential — 6-Month Prepaid' },
      { lookupKey: 'essential_annual', unitAmount: 669120, interval: 'year', intervalCount: 1, nickname: 'Essential — Annual Prepaid' },
    ],
  },
  {
    planKey: 'growth-engine',
    name: 'Updigitly Growth Engine',
    prices: [
      { lookupKey: 'growth_monthly', unitAmount: 199700, interval: 'month', intervalCount: 1, nickname: 'Growth Engine — Monthly' },
      { lookupKey: 'growth_six_month', unitAmount: 1078380, interval: 'month', intervalCount: 6, nickname: 'Growth Engine — 6-Month Prepaid' },
      { lookupKey: 'growth_annual', unitAmount: 1917120, interval: 'year', intervalCount: 1, nickname: 'Growth Engine — Annual Prepaid' },
    ],
  },
];

async function findOrCreateProduct(stripe: Stripe, planKey: string, name: string): Promise<Stripe.Product> {
  const query = `active:'true' AND metadata['app']:'updigitly-site' AND metadata['plan_key']:'${planKey}'`;
  try {
    const found = await stripe.products.search({ query, limit: 1 });
    if (found.data[0]) return found.data[0];
  } catch {
    // search index can lag right after creation — fall through to create.
  }
  return stripe.products.create({ name, metadata: { app: 'updigitly-site', plan_key: planKey } });
}

async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!stripeConfigured) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const stripe = getStripe();
  const prices: Record<string, { priceId: string; created: boolean }> = {};

  for (const plan of PLAN_SEEDS) {
    const product = await findOrCreateProduct(stripe, plan.planKey, plan.name);
    for (const p of plan.prices) {
      const existing = await stripe.prices.list({ lookup_keys: [p.lookupKey], active: true, limit: 1 });
      if (existing.data[0]) {
        prices[p.lookupKey] = { priceId: existing.data[0].id, created: false };
        continue;
      }
      const price = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: p.unitAmount,
        nickname: p.nickname,
        lookup_key: p.lookupKey,
        recurring: { interval: p.interval, interval_count: p.intervalCount },
        metadata: { app: 'updigitly-site', plan_key: plan.planKey, price_version: stripeEnv.priceVersion },
      });
      prices[p.lookupKey] = { priceId: price.id, created: true };
    }
  }

  // Sanity: confirm every lookup_key our runtime map expects now resolves.
  const missing: string[] = [];
  for (const perPlan of Object.values(PLAN_TERM_LOOKUP)) {
    for (const lk of Object.values(perPlan)) if (!prices[lk]) missing.push(lk);
  }

  return NextResponse.json({ ok: missing.length === 0, priceVersion: stripeEnv.priceVersion, prices, missing });
}

export const GET = run;
export const POST = run;
