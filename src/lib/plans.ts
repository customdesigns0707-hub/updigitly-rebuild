/**
 * Pricing — single source of truth for the pricing page (presentation only in
 * Chat 1; enrollment wiring is Chat 2/3). Model is LOCKED per Decision #2 v4
 * (2026-07-11). All discount / term / commitment math is DERIVED here, never
 * hardcoded, so displayed numbers can never drift from the locked model.
 *
 * Prices are WORKING LAUNCH PRICES (reviewable against real account data);
 * the ARCHITECTURE is locked, the numbers are not promises of permanence.
 */

/** The 6-month initial service commitment applies to EVERY plan regardless of
 *  billing choice. "Monthly" is a payment schedule, not a one-month term. */
export const INITIAL_TERM_MONTHS = 6;

export type BillingKey = 'monthly' | 'sixPrepaid' | 'annualPrepaid';

/**
 * Billing options. Discounts purely buy PREPAYMENT (cash upfront); the 6-month
 * commitment is constant across all three. `prepaidMonths` = how many months
 * the upfront charge covers (monthly bills one month at a time).
 */
export const BILLING: Record<
  BillingKey,
  { label: string; short: string; discount: number; prepaidMonths: number }
> = {
  monthly: { label: 'Monthly', short: 'Monthly', discount: 0, prepaidMonths: 1 },
  sixPrepaid: { label: '6-Month Prepaid', short: '6-Month', discount: 0.1, prepaidMonths: 6 },
  annualPrepaid: { label: 'Annual Prepaid', short: 'Annual', discount: 0.2, prepaidMonths: 12 },
};

export type PlanKey = 'essential' | 'growth-engine' | 'scale';

export interface Plan {
  key: PlanKey;
  /** DOM anchor id — matches footer/home plan links (#essential, #growth-engine, #scale). */
  anchor: string;
  name: string;
  audience: string;
  tagline: string;
  /** Monthly base price in USD. null = no public price (Scale). */
  base: number | null;
  recommended: boolean;
  /** Outcome-framed capabilities inside the four-pillar frame — never a flat service menu. */
  outcomes: string[];
  cta: { label: string; kind: 'enroll' | 'book' };
}

export const PLANS: Plan[] = [
  {
    key: 'essential',
    anchor: 'essential',
    name: 'Essential',
    audience: 'For businesses that are digitally weak, invisible, or fragmented.',
    tagline: 'We install and fully operate the essential digital spine — then keep it running.',
    base: 697,
    recommended: false,
    outcomes: [
      'A credible, conversion-ready presence that turns visits into enquiries',
      'Lead capture that answers every enquiry the moment it lands',
      'Standard follow-up so no opportunity goes cold',
      'A basic pipeline that keeps every lead visible and moving',
      'A reputation foundation that builds trust before the first call',
      'Clear measurement — with a senior team operating all of it for you',
    ],
    cta: { label: 'Enroll in Essential', kind: 'enroll' },
  },
  {
    key: 'growth-engine',
    anchor: 'growth-engine',
    name: 'Growth Engine',
    audience: 'For established businesses with some assets and momentum to build on.',
    tagline: 'A standardized managed core across all four pillars — prioritized by expected impact.',
    base: 1997,
    recommended: true,
    outcomes: [
      'Everything in Essential, operated at depth',
      'Foundation — presence, conversion, and trust kept sharp',
      'Visibility — search, local presence, reputation, and content worked actively',
      'Growth — capture, CRM, automation, and follow-up that compound',
      'Intelligence — tracking, reporting, and continuous prioritized improvement',
      'Work prioritized by expected impact, not fixed task quotas',
    ],
    cta: { label: 'Enroll in Growth Engine', kind: 'enroll' },
  },
  {
    key: 'scale',
    anchor: 'scale',
    name: 'Scale',
    audience: 'For organizations with materially greater complexity and strategic scope.',
    tagline:
      'A materially different relationship — strategic responsibility and coordination across brands, markets, systems, and channels.',
    base: null,
    recommended: false,
    outcomes: [
      'A designed strategic engagement, not Growth-plus-add-ons',
      'Coordination across materially different teams, brands, and channels',
      'Executive involvement and ongoing strategic responsibility',
      'Scoped to your organization — enrollment by strategy call only',
    ],
    cta: { label: 'Book a strategy call', kind: 'book' },
  },
];

/** Growth's scope-protection sentence — LOCKED verbatim (Decision #2). */
export const GROWTH_SCOPE_NOTE =
  'We prioritize and manage the work most likely to improve performance. Additional locations, channels, production, and specialized systems are scoped separately.';

/** Page-level pricing disclosures — LOCKED set (Decision #2). */
export const PRICING_DISCLOSURES: string[] = [
  'All plans carry a 6-month initial service commitment. Monthly is a payment schedule, not a one-month term.',
  'Ad spend (e.g. Google, Meta) is billed separately and is not included in plan pricing.',
  'Third-party software and production costs may be additional where a specific engagement requires them.',
  'Final scope is defined in your service agreement.',
  'Complex, multi-location, or multi-brand needs are scoped as a tailored proposal — start with a strategy call.',
];

/** Formats a number as USD, e.g. 3763.8 -> "$3,763.80". Pass `trim` to drop .00. */
export function usd(n: number, trim = false): string {
  const s = '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return trim ? s.replace('.00', '') : s;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Derives the displayed numbers for a plan base + billing option:
 *  - effectiveMonthly : discounted per-month rate
 *  - chargedNow       : the upfront charge (1 month monthly · 6 or 12 prepaid)
 *  - coversMonths     : months the upfront charge covers
 *  - savings          : saved vs paying the full base for `coversMonths`
 *  - minCommitment    : minimum total obligation over the 6-month initial term
 */
export function priceFor(base: number, billing: BillingKey) {
  const b = BILLING[billing];
  const effectiveMonthly = round2(base * (1 - b.discount));
  const chargedNow = round2(effectiveMonthly * b.prepaidMonths);
  const savings = round2(base * b.prepaidMonths - chargedNow);
  const minCommitment = round2(base * INITIAL_TERM_MONTHS); // undiscounted floor for monthly
  return {
    effectiveMonthly,
    chargedNow,
    coversMonths: b.prepaidMonths,
    savings,
    minCommitment,
    discount: b.discount,
  };
}
