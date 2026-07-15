/**
 * Onboarding domain logic — the "Standard" question set (Chat 4 follow-up to
 * Decision #2/#4). Collects ONLY what the qualifier + disclosure didn't already
 * capture: access & assets, primary goal + timeline, target customer, top
 * competitors, and anything to preserve or avoid. Contact/business/plan/qualifier
 * answers are never re-asked — the onboarding page reads those from the
 * enrollment record directly.
 *
 * Shared by the client form AND the server API, so option values and validation
 * can never drift. NO server-only imports here (crosses to the browser).
 */
import { z } from 'zod';

/* ─── Choice questions ─────────────────────────────────────────────────── */
export const ONBOARDING_QUESTIONS = [
  {
    id: 'accountsToConnect',
    kind: 'multi',
    label: 'Which accounts should we connect or take over?',
    help: 'Select all that apply — we’ll request access during onboarding, never before.',
    options: [
      { value: 'domain_hosting', label: 'Domain / hosting' },
      { value: 'google_business', label: 'Google Business Profile' },
      { value: 'google_analytics', label: 'Analytics / Search Console' },
      { value: 'social', label: 'Social media accounts' },
      { value: 'existing_crm', label: 'Existing CRM / email tool' },
    ],
  },
  {
    id: 'primaryGoal',
    kind: 'single',
    label: 'What’s the single most important outcome for the first 90 days?',
    help: null,
    options: [
      { value: 'more_leads', label: 'More leads / calls' },
      { value: 'more_sales', label: 'More online sales' },
      { value: 'credibility', label: 'A more credible, trustworthy presence' },
      { value: 'local_visibility', label: 'Better local / maps visibility' },
    ],
  },
  {
    id: 'timeline',
    kind: 'single',
    label: 'How soon do you want to see meaningful progress?',
    help: null,
    options: [
      { value: 'asap', label: 'As soon as possible' },
      { value: 'one_three', label: '1–3 months' },
      { value: 'three_six', label: '3–6 months' },
      { value: 'no_rush', label: 'No fixed timeline' },
    ],
  },
] as const;

type SingleId = 'primaryGoal' | 'timeline';
const singleValues = (id: SingleId) =>
  ONBOARDING_QUESTIONS.find((q) => q.id === id)!.options.map((o) => o.value) as [string, ...string[]];
const accountValues = ONBOARDING_QUESTIONS.find((q) => q.id === 'accountsToConnect')!.options.map(
  (o) => o.value,
) as [string, ...string[]];

/** Human-readable label for a stored answer value (review display + GHL note). */
export function onboardingAnswerLabel(qId: string, value: string): string {
  const q = ONBOARDING_QUESTIONS.find((x) => x.id === qId);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}

/* ─── Validation (server-authoritative; the form reuses the same schema) ── */
const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

export const onboardingAnswersSchema = z.object({
  accountsToConnect: z.array(z.enum(accountValues)).max(6).default([]),
  primaryGoal: z.enum(singleValues('primaryGoal')),
  timeline: z.enum(singleValues('timeline')),
  targetCustomer: z
    .string()
    .trim()
    .min(1, 'Please tell us a bit about your customer.')
    .max(800),
  competitors: optionalText(400),
  brandAssets: optionalText(800),
  domainAccess: optionalText(800),
  preserveOrAvoid: optionalText(800),
});
export type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;

/** Lenient variant for draft (save-progress) submissions — every field optional,
 *  so an in-progress form can be persisted before it's complete. */
export const onboardingDraftSchema = onboardingAnswersSchema.partial();
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
