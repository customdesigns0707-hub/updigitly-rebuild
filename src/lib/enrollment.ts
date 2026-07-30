/**
 * Enrollment domain logic — the four LOCKED qualifier questions, validation,
 * soft-complexity derivation, and the disclosure price snapshot.
 *
 * Shared by the client form AND the server API, so option values, validation,
 * and money math can never drift between what the visitor sees and what the
 * server stores. NO server-only imports here (it crosses to the browser).
 *
 * Question set + soft-complexity rules are the V1 realization of Decision #4's
 * open item 4. Soft-signal ONLY — never auto-reject/reprice (Decision #2/#4).
 */
import { z } from 'zod';
import {
  PLANS,
  BILLING,
  INITIAL_TERM_MONTHS,
  priceFor,
  fixedTermMonths,
  usd,
  type BillingKey,
  type PlanKey,
} from './plans';

/* ─── The four locked qualifier questions ──────────────────────────────────
   Taps/radios/toggles, not free text (Decision #4 UX). One shared definition. */
export const QUALIFIER_QUESTIONS = [
  {
    id: 'locations',
    kind: 'single',
    label: 'How many locations or brands does this cover?',
    help: 'So we size the engagement correctly.',
    options: [
      { value: 'one', label: 'Just one' },
      { value: 'few', label: '2–3' },
      { value: 'many', label: '4 or more' },
    ],
  },
  {
    id: 'website',
    kind: 'single',
    label: 'What best describes your current website?',
    help: null,
    options: [
      { value: 'none', label: 'No website yet' },
      { value: 'needs_work', label: 'Have one — needs work' },
      { value: 'performs', label: 'Have one — performs well' },
      { value: 'multiple', label: 'Multiple sites' },
    ],
  },
  {
    id: 'crm',
    kind: 'single',
    label: 'Any existing CRM or contact database to migrate?',
    help: null,
    options: [
      { value: 'none', label: 'No — starting fresh' },
      { value: 'list', label: 'A simple list or spreadsheet' },
      { value: 'active', label: 'Yes — an active CRM to migrate' },
    ],
  },
  {
    id: 'needs',
    kind: 'multi',
    label: 'Do any of these apply?',
    help: 'Select all that apply — or none.',
    options: [
      { value: 'ecommerce', label: 'Online store / e-commerce' },
      { value: 'membership', label: 'Memberships or logins' },
      { value: 'integration', label: 'Custom integrations' },
    ],
  },
] as const;

type SingleId = 'locations' | 'website' | 'crm';
const singleValues = (id: SingleId) =>
  QUALIFIER_QUESTIONS.find((q) => q.id === id)!.options.map((o) => o.value) as [string, ...string[]];
const needsValues = QUALIFIER_QUESTIONS.find((q) => q.id === 'needs')!.options.map(
  (o) => o.value,
) as [string, ...string[]];

/* ─── Validation (server-authoritative; the form reuses the same schema) ──── */
const trimmed = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const qualifierAnswersSchema = z.object({
  locations: z.enum(singleValues('locations')),
  website: z.enum(singleValues('website')),
  crm: z.enum(singleValues('crm')),
  needs: z.array(z.enum(needsValues)).max(3).default([]),
});
export type QualifierAnswers = z.infer<typeof qualifierAnswersSchema>;

export const enrollableKeys = ['essential', 'growth-engine'] as const;
export type EnrollablePlanKey = (typeof enrollableKeys)[number];
export const isEnrollablePlan = (v: string): v is EnrollablePlanKey =>
  (enrollableKeys as readonly string[]).includes(v);

export const billingKeys = Object.keys(BILLING) as [BillingKey, ...BillingKey[]];

export const enrollSubmitSchema = z.object({
  plan: z.enum(enrollableKeys),
  billing: z.enum(billingKeys).default('monthly'),
  contactName: trimmed(1, 120),
  businessName: trimmed(1, 160),
  email: z.string().trim().email().max(200),
  phone: trimmed(7, 40),
  answers: qualifierAnswersSchema,
  anythingElse: z.string().trim().max(1000).optional().default(''),
  turnstileToken: z.string().max(3000).optional().default(''),
});
export type EnrollSubmit = z.infer<typeof enrollSubmitSchema>;

export const contactPurposes = [
  'General question',
  'Existing client',
  'Partnership',
  'Billing',
  'Other',
] as const;

export const contactSubmitSchema = z.object({
  name: trimmed(1, 120),
  business: z.string().trim().max(160).optional().default(''),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(''),
  purpose: z.enum(contactPurposes),
  message: trimmed(1, 3000),
  turnstileToken: z.string().max(3000).optional().default(''),
});
export type ContactSubmit = z.infer<typeof contactSubmitSchema>;

/* ─── Soft-complexity derivation (V1: present-a-choice, never auto-reject) ── */
export function deriveComplexityFlags(a: QualifierAnswers): string[] {
  const flags: string[] = [];
  if (a.locations === 'few' || a.locations === 'many') flags.push('Multiple locations or brands');
  if (a.website === 'multiple') flags.push('Multiple existing websites');
  if (a.crm === 'active') flags.push('Migrating an active CRM');
  if (a.needs.includes('ecommerce')) flags.push('E-commerce / online store');
  if (a.needs.includes('membership')) flags.push('Memberships or gated logins');
  if (a.needs.includes('integration')) flags.push('Custom integrations');
  return flags;
}

/** Human-readable label for a stored answer value (for review page + GHL note). */
export function answerLabel(qId: string, value: string): string {
  const q = QUALIFIER_QUESTIONS.find((x) => x.id === qId);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}

/* ─── Disclosure snapshot ──────────────────────────────────────────────────
   The frozen money view stored as acceptance evidence. LOUD, and stored
   verbatim so the record can't drift from what the visitor saw (Decision #4). */
// v2 (interim launch, 2026-07-28): fixed-term billing with NO automatic renewal.
export const DISCLOSURE_VERSION = 'v2-2026-07';

/**
 * LOCKED verbatim (Decision #2, superseded 2026-07-30) — the doubt-reducer
 * shown near checkout. Originally a vague discretionary "fair resolution";
 * replaced with the objective refund standard from /legal#cancellation
 * (cure-then-credit/prorated-refund) so this can't diverge from the published
 * policy again. Changing this constant only affects FUTURE acceptances —
 * already-frozen disclosure_acceptances rows keep whatever text was actually
 * shown at accept time (that's the point of freezing it as evidence).
 */
export const REFUND_POLICY_SENTENCE =
  'If we determine during onboarding that the selected plan cannot deliver the core engagement as presented, ' +
  'we will first have a reasonable opportunity to correct it; if it is not corrected, we will provide an ' +
  'appropriate credit or a prorated refund for the undelivered portion, consistent with our refund policy.';

export interface PriceSnapshot {
  planKey: PlanKey;
  planName: string;
  billingKey: BillingKey;
  billingLabel: string;
  /** Charged today, in dollars. */
  immediateCharge: number;
  immediateChargeText: string;
  /** Discounted per-month equivalent. */
  effectiveMonthly: number;
  /** What recurs, and when — billing-aware. */
  recurringAmount: number;
  recurringText: string;
  coversMonths: number;
  savings: number;
  discount: number;
  /** Fixed legal minimum (6mo) — invariant across billing choice; see review page copy. */
  initialTermMonths: number;
  /** Actual commitment length for THIS billing choice: 6 for monthly/sixPrepaid, 12 for
   *  annualPrepaid. Use this (not initialTermMonths) anywhere the term length is paired
   *  with a dollar figure that reflects the full prepaid coverage — otherwise annual
   *  prepaid reads as "6-month term" next to a 12-month charge. Matches fixedTermMonths(),
   *  the same function that sets the real Stripe subscription cancel_at. */
  commitmentMonths: number;
  /** Minimum total obligation over the initial term (billing-aware). */
  minCommitment: number;
  minCommitmentText: string;
  renewalBehavior: string;
  disclosureVersion: string;
  refundPolicy: string;
  capturedAt: string;
}

export function buildPriceSnapshot(planKey: EnrollablePlanKey, billingKey: BillingKey): PriceSnapshot {
  const plan = PLANS.find((p) => p.key === planKey);
  if (!plan || plan.base === null) throw new Error(`Not an enrollable priced plan: ${planKey}`);
  const b = BILLING[billingKey];
  const p = priceFor(plan.base, billingKey);

  // Actual commitment length for this billing choice: 6 for monthly/sixPrepaid,
  // 12 for annualPrepaid. Same function that sets the real Stripe cancel_at, so
  // the displayed term length and the actual billing cap can never drift apart.
  const commitmentMonths = fixedTermMonths(billingKey);

  // Minimum total obligation over the commitment length, billing-aware:
  //  monthly → 6 × base (owed if cancelled early); prepaid → the amount already
  //  charged (fully covers the commitment).
  const minCommitment =
    billingKey === 'monthly' ? Math.round(plan.base * INITIAL_TERM_MONTHS * 100) / 100 : p.chargedNow;

  let recurringAmount: number;
  let recurringText: string;
  if (billingKey === 'monthly') {
    recurringAmount = p.effectiveMonthly;
    recurringText =
      `${usd(p.effectiveMonthly)} per month for the ${INITIAL_TERM_MONTHS}-month initial term ` +
      `(${INITIAL_TERM_MONTHS} payments in total), starting one month after your first charge. ` +
      `Billing then stops automatically — there is no auto-renewal.`;
  } else {
    recurringAmount = 0;
    recurringText =
      `No recurring charge. Your one-time ${usd(p.chargedNow)} payment covers ${p.coversMonths} months in full. ` +
      `This is a fixed prepaid term with no automatic renewal — nothing is charged again unless you start a new engagement.`;
  }

  const renewalBehavior =
    billingKey === 'monthly'
      ? `This is a fixed ${INITIAL_TERM_MONTHS}-month term. After the ${INITIAL_TERM_MONTHS} monthly payments, ` +
        `billing stops automatically — there is no auto-renewal. Continuing later is a new, separately agreed engagement.`
      : `This is a fixed prepaid term covering ${p.coversMonths} months. Billing stops automatically at the end — ` +
        `there is no auto-renewal. Continuing later is a new, separately agreed engagement.`;

  return {
    planKey,
    planName: plan.name,
    billingKey,
    billingLabel: b.label,
    immediateCharge: p.chargedNow,
    immediateChargeText: `${usd(p.chargedNow)} charged today${
      billingKey === 'monthly' ? '' : ` (covers ${p.coversMonths} months)`
    }.`,
    effectiveMonthly: p.effectiveMonthly,
    recurringAmount,
    recurringText,
    coversMonths: p.coversMonths,
    savings: p.savings,
    discount: p.discount,
    initialTermMonths: INITIAL_TERM_MONTHS,
    commitmentMonths,
    minCommitment,
    minCommitmentText: `${usd(minCommitment)} — your minimum total obligation for the ${commitmentMonths}-month initial term.`,
    renewalBehavior,
    disclosureVersion: DISCLOSURE_VERSION,
    refundPolicy: REFUND_POLICY_SENTENCE,
    capturedAt: new Date().toISOString(),
  };
}
