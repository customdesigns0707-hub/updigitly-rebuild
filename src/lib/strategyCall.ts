/**
 * Strategy Call pre-booking qualifier — domain logic (picked up from the
 * placeholder left in Chat 4; see [[updigitly-phase2-chat4]]). This is NOT
 * part of the locked Decision #4 qualifier (that's the four Essential/Growth
 * questions in `enrollment.ts`) — the question set here was never specified
 * in Phase 1, so it's a fresh, deliberately small set aimed at prospects
 * complex enough (or unclear enough) to land on Scale's only enrollment path.
 *
 * Mirrors `enrollment.ts`'s shape (shared client+server module, taps/radios
 * over free text, one Zod schema reused by the form and the API route) so the
 * two qualifiers stay consistent in feel without being the same instrument.
 *
 * NOT a gate: per Decision #3, /strategy-call is also the escape hatch for
 * unclear situations, so this qualifier never blocks or delays booking — the
 * calendar sits alongside it, always available. No pricing, no plan lock, no
 * complexity-based routing — just prep context for the strategist.
 */
import { z } from 'zod';

export const STRATEGY_QUALIFIER_QUESTIONS = [
  {
    id: 'locations',
    kind: 'single',
    label: 'How many locations or brands are we talking about?',
    help: 'So we come to the call with the right frame.',
    options: [
      { value: 'one', label: 'Just one' },
      { value: 'few', label: '2–3' },
      { value: 'many', label: '4 or more' },
    ],
  },
  {
    id: 'presence',
    kind: 'single',
    label: 'What best describes your current online presence?',
    help: null,
    options: [
      { value: 'none', label: 'No website yet' },
      { value: 'needs_work', label: 'Have one — needs work' },
      { value: 'performs', label: 'Have one — performs well' },
      { value: 'multiple', label: 'Multiple sites or brands' },
    ],
  },
  {
    id: 'teamSize',
    kind: 'single',
    label: 'Roughly how big is your team?',
    help: null,
    options: [
      { value: 'solo', label: 'Just me' },
      { value: 'small', label: '2–10 people' },
      { value: 'mid', label: '11–50 people' },
      { value: 'large', label: '50+ people, or multiple departments' },
    ],
  },
] as const;

type SingleId = (typeof STRATEGY_QUALIFIER_QUESTIONS)[number]['id'];
const singleValues = (id: SingleId) =>
  STRATEGY_QUALIFIER_QUESTIONS.find((q) => q.id === id)!.options.map((o) => o.value) as [
    string,
    ...string[],
  ];

/* ─── Validation (server-authoritative; the form reuses the same schema) ──── */
const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const strategyQualifierAnswersSchema = z.object({
  locations: z.enum(singleValues('locations')),
  presence: z.enum(singleValues('presence')),
  teamSize: z.enum(singleValues('teamSize')),
});
export type StrategyQualifierAnswers = z.infer<typeof strategyQualifierAnswersSchema>;

export const strategyCallSubmitSchema = z.object({
  contactName: trimmed(1, 120),
  businessName: trimmed(1, 160),
  email: z.string().trim().email().max(200),
  phone: trimmed(7, 40),
  answers: strategyQualifierAnswersSchema,
  /** Required — the main call-prep field ("what's the goal for this call?"). */
  goal: trimmed(10, 1000),
  anythingElse: z.string().trim().max(1000).optional().default(''),
  turnstileToken: z.string().max(3000).optional().default(''),
});
export type StrategyCallSubmit = z.infer<typeof strategyCallSubmitSchema>;

/** Human-readable label for a stored answer value (review + GHL note). */
export function strategyAnswerLabel(qId: string, value: string): string {
  const q = STRATEGY_QUALIFIER_QUESTIONS.find((x) => x.id === qId);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}
