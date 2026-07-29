/**
 * Repository — all Postgres reads/writes for enrollment + contact. Server-only.
 * State transitions use compare-and-set so a replayed request never double-acts,
 * and each genuine transition writes exactly one immutable stage_event that the
 * GHL sync worker later drains idempotently (Decision #4).
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { getSql } from './db';
import {
  type EnrollablePlanKey,
  type QualifierAnswers,
  deriveComplexityFlags,
} from './enrollment';
import type { BillingKey } from './plans';
import type { StrategyQualifierAnswers } from './strategyCall';

export interface Enrollment {
  id: string;
  secureId: string;
  planKey: EnrollablePlanKey;
  billingKey: BillingKey;
  status:
    | 'qualifier_submitted'
    | 'disclosure_accepted'
    | 'awaiting_payment'
    | 'paid'
    | 'cancelled';
  contactName: string;
  businessName: string;
  email: string;
  phone: string;
  qualifier: QualifierAnswers;
  anythingElse: string | null;
  complexityFlags: string[];
  ghlContactId: string | null;
  // Billing mirror of Stripe's authoritative record (Decision #4 rev).
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCheckoutSessionId: string | null;
  paidAt: string | null;
  contractStartDate: string | null;
  initialTermEndDate: string | null;
  priceVersion: string | null;
  // Approval-before-payment gate (interim launch, 2026-07-28). Checkout stays
  // locked until Updigitly approves — cold-call approved live, inbound held.
  paymentApproved: boolean;
  paymentApprovedAt: string | null;
  paymentApprovalNote: string | null;
  // When Stripe will stop billing (fixed term, no auto-renewal). Set at payment.
  subscriptionCancelAt: string | null;
  // Subscription lifecycle beyond the initial payment (Chat 4 hardening).
  cancelledAt: string | null;
  paymentFailedAt: string | null;
  paymentFailedCount: number;
  createdAt: string;
  updatedAt: string;
}

function mapEnrollment(r: any): Enrollment {
  return {
    id: r.id,
    secureId: r.secure_id,
    planKey: r.plan_key,
    billingKey: r.billing_key,
    status: r.status,
    contactName: r.contact_name,
    businessName: r.business_name,
    email: r.email,
    phone: r.phone,
    qualifier: r.qualifier,
    anythingElse: r.anything_else,
    complexityFlags: r.complexity_flags ?? [],
    ghlContactId: r.ghl_contact_id,
    stripeCustomerId: r.stripe_customer_id ?? null,
    stripeSubscriptionId: r.stripe_subscription_id ?? null,
    stripeCheckoutSessionId: r.stripe_checkout_session_id ?? null,
    paidAt: r.paid_at ?? null,
    contractStartDate: r.contract_start_date ?? null,
    initialTermEndDate: r.initial_term_end_date ?? null,
    priceVersion: r.price_version ?? null,
    paymentApproved: r.payment_approved ?? false,
    paymentApprovedAt: r.payment_approved_at ?? null,
    paymentApprovalNote: r.payment_approval_note ?? null,
    subscriptionCancelAt: r.subscription_cancel_at ?? null,
    cancelledAt: r.cancelled_at ?? null,
    paymentFailedAt: r.payment_failed_at ?? null,
    paymentFailedCount: r.payment_failed_count ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Unguessable, URL-safe token for the enrollment's private review URL. */
export function newSecureId(): string {
  return randomBytes(18).toString('base64url'); // 24 chars, ~144 bits
}

/** Unguessable token for the private /onboarding/[token] URL. */
export function newOnboardingToken(): string {
  return randomBytes(24).toString('base64url'); // 32 chars, ~192 bits
}

export interface CreateEnrollmentInput {
  plan: EnrollablePlanKey;
  billing: BillingKey;
  contactName: string;
  businessName: string;
  email: string;
  phone: string;
  answers: QualifierAnswers;
  anythingElse?: string;
}

/**
 * Persist a qualifier submission. In one transaction: insert the enrollment,
 * seed its sync-state row, and record the immutable `qualifier_submitted`
 * stage event that the GHL worker will pick up.
 */
export async function createEnrollment(input: CreateEnrollmentInput): Promise<Enrollment> {
  const sql = getSql();
  const secureId = newSecureId();
  const complexity = deriveComplexityFlags(input.answers);

  const row = await sql.begin(async (tx) => {
    const [enr] = await tx`
      insert into enrollments
        (secure_id, plan_key, billing_key, contact_name, business_name, email, phone,
         qualifier, anything_else, complexity_flags)
      values
        (${secureId}, ${input.plan}, ${input.billing}, ${input.contactName},
         ${input.businessName}, ${input.email}, ${input.phone},
         ${tx.json(input.answers)}, ${input.anythingElse ?? null}, ${tx.json(complexity)})
      returning *`;

    await tx`
      insert into ghl_sync_state (enrollment_id)
      values (${enr.id})
      on conflict (enrollment_id) do nothing`;

    await tx`
      insert into stage_events (enrollment_id, stage, payload)
      values (${enr.id}, 'qualifier_submitted', ${tx.json({ plan: input.plan })})
      on conflict (enrollment_id, stage) do nothing`;

    return enr;
  });

  return mapEnrollment(row);
}

export async function getEnrollmentBySecureId(secureId: string): Promise<Enrollment | null> {
  const sql = getSql();
  const [row] = await sql`select * from enrollments where secure_id = ${secureId} limit 1`;
  return row ? mapEnrollment(row) : null;
}

/**
 * Change the billing option before the disclosure is accepted. Compare-and-set:
 * only applies while still in `qualifier_submitted`, so a switch can't mutate an
 * already-accepted (evidence-frozen) enrollment. Returns the updated row or null.
 */
export async function updateBilling(
  secureId: string,
  billing: BillingKey,
): Promise<Enrollment | null> {
  const sql = getSql();
  const [row] = await sql`
    update enrollments
       set billing_key = ${billing}, updated_at = now()
     where secure_id = ${secureId} and status = 'qualifier_submitted'
     returning *`;
  return row ? mapEnrollment(row) : null;
}

export interface RecordAcceptanceInput {
  secureId: string;
  disclosureVersion: string;
  /** Version of the combined Service Order + Agreement the client accepted. */
  agreementVersion: string;
  priceSnapshot: unknown;
  acceptanceText: string;
  ip: string | null;
  userAgent: string | null;
  /** Compact summary stored on the disclosure stage_event so the GHL note the
   *  sync worker writes carries plan/billing/charge without a second query. */
  eventPayload?: Record<string, unknown>;
}

export type AcceptanceResult =
  | { ok: true; enrollment: Enrollment; alreadyAccepted: boolean }
  | { ok: false; reason: 'not_found' | 'wrong_status' };

/**
 * Record disclosure acceptance as immutable evidence and advance the stage.
 * Compare-and-set on status makes a double-submit safe: the second call sees
 * `disclosure_accepted`, records no new evidence, and reports alreadyAccepted.
 */
export async function recordDisclosureAcceptance(
  input: RecordAcceptanceInput,
): Promise<AcceptanceResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const [enr] = await tx`
      select * from enrollments where secure_id = ${input.secureId} for update`;
    if (!enr) return { ok: false, reason: 'not_found' } as const;

    if (enr.status === 'disclosure_accepted' || enr.status === 'awaiting_payment') {
      return { ok: true, enrollment: mapEnrollment(enr), alreadyAccepted: true } as const;
    }
    if (enr.status !== 'qualifier_submitted') {
      return { ok: false, reason: 'wrong_status' } as const;
    }

    await tx`
      insert into disclosure_acceptances
        (enrollment_id, disclosure_version, agreement_version, price_snapshot, acceptance_text, ip, user_agent)
      values
        (${enr.id}, ${input.disclosureVersion}, ${input.agreementVersion},
         ${tx.json(input.priceSnapshot as Parameters<typeof tx.json>[0])},
         ${input.acceptanceText}, ${input.ip}, ${input.userAgent})`;

    const [updated] = await tx`
      update enrollments set status = 'disclosure_accepted', updated_at = now()
       where id = ${enr.id} returning *`;

    await tx`
      insert into stage_events (enrollment_id, stage, payload)
      values (${enr.id}, 'disclosure_accepted',
              ${tx.json((input.eventPayload ?? { version: input.disclosureVersion }) as Parameters<typeof tx.json>[0])})
      on conflict (enrollment_id, stage) do nothing`;

    return { ok: true, enrollment: mapEnrollment(updated), alreadyAccepted: false } as const;
  });
}

/** Latest disclosure acceptance for an enrollment (for the confirmation page). */
export async function getLatestAcceptance(enrollmentId: string) {
  const sql = getSql();
  const [row] = await sql`
    select * from disclosure_acceptances
     where enrollment_id = ${enrollmentId}
     order by accepted_at desc limit 1`;
  return row ?? null;
}

export async function getEnrollmentById(id: string): Promise<Enrollment | null> {
  const sql = getSql();
  const [row] = await sql`select * from enrollments where id = ${id} limit 1`;
  return row ? mapEnrollment(row) : null;
}

/**
 * Mark that a Stripe Checkout Session was created for this enrollment. Advances
 * `disclosure_accepted` → `awaiting_payment` (compare-and-set; a re-click while
 * already awaiting just refreshes the stored session id; never touches `paid`).
 */
export async function markAwaitingPayment(
  secureId: string,
  sessionId: string,
): Promise<Enrollment | null> {
  const sql = getSql();
  const [row] = await sql`
    update enrollments
       set status = case when status = 'disclosure_accepted' then 'awaiting_payment' else status end,
           stripe_checkout_session_id = ${sessionId},
           updated_at = now()
     where secure_id = ${secureId} and status in ('disclosure_accepted','awaiting_payment')
     returning *`;
  return row ? mapEnrollment(row) : null;
}

/**
 * Approve an enrollment for payment (interim launch, 2026-07-28). The
 * checkout button stays locked until this flips `payment_approved`. Two paths,
 * one mechanism: a cold-call prospect is approved live on the call (immediate);
 * an unassisted inbound enrollment is held until the operator reviews and calls
 * this. Records the standard "fit reviewed and approved before payment" note.
 * Idempotent: approving an already-approved enrollment just refreshes the note.
 * Returns null only if the enrollment doesn't exist.
 */
export async function approvePayment(
  secureId: string,
  note?: string,
): Promise<Enrollment | null> {
  const sql = getSql();
  const approvalNote = note?.trim() || 'Fit reviewed and approved by Updigitly before payment.';
  const [row] = await sql`
    update enrollments
       set payment_approved = true,
           payment_approved_at = coalesce(payment_approved_at, now()),
           payment_approval_note = ${approvalNote},
           updated_at = now()
     where secure_id = ${secureId}
     returning *`;
  return row ? mapEnrollment(row) : null;
}

/** Record the timestamp Stripe is set to stop billing (fixed term). Idempotent. */
export async function recordSubscriptionCancelAt(
  enrollmentId: string,
  cancelAt: Date,
): Promise<void> {
  const sql = getSql();
  await sql`
    update enrollments
       set subscription_cancel_at = ${cancelAt.toISOString()}, updated_at = now()
     where id = ${enrollmentId}`;
}

export interface StripePaymentInput {
  /** Stripe event id (evt_…) — the idempotency key. */
  eventId: string;
  eventType: string;
  /** Enrollment secure id, carried on the session as client_reference_id. */
  secureId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCheckoutSessionId: string | null;
  priceVersion: string | null;
  payload?: unknown;
}

export type StripePaymentResult =
  | {
      ok: true;
      outcome: 'applied' | 'duplicate_event' | 'already_paid';
      enrollment: Enrollment;
      onboardingToken: string | null;
    }
  | { ok: false; reason: 'enrollment_not_found' };

/**
 * Reconcile a verified Stripe payment against exactly one enrollment — the core
 * of the webhook. All in ONE transaction so it is atomic and idempotent:
 *  • Claims the Stripe event id (unique PK). A duplicate delivery finds the id
 *    already present and returns `duplicate_event` with NO side effects.
 *  • A mid-way failure rolls the whole tx back (including the event claim), so
 *    Stripe's retry safely reprocesses — no partial state.
 *  • Compare-and-set on status: a second, distinct event for an already-paid
 *    enrollment returns `already_paid` without re-creating onboarding.
 *  • Onboarding row is unique per enrollment (`on conflict do nothing`), so it
 *    can never be created twice.
 */
export async function recordStripePayment(input: StripePaymentInput): Promise<StripePaymentResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const json = (v: unknown) => v as Parameters<typeof tx.json>[0];
    // 1. Claim the event id. Empty result ⇒ this exact event was already processed.
    const claimed = await tx`
      insert into stripe_events (id, type, payload)
      values (${input.eventId}, ${input.eventType}, ${tx.json(json(input.payload ?? {}))})
      on conflict (id) do nothing
      returning id`;
    const duplicateEvent = claimed.length === 0;

    // 2. Match to exactly one enrollment and lock it.
    const [enr] = await tx`select * from enrollments where secure_id = ${input.secureId} for update`;
    if (!enr) return { ok: false, reason: 'enrollment_not_found' } as const;

    const currentToken = async () =>
      (await tx`select secure_token from onboarding where enrollment_id = ${enr.id} limit 1`)[0]
        ?.secure_token ?? null;

    if (duplicateEvent) {
      return {
        ok: true,
        outcome: 'duplicate_event',
        enrollment: mapEnrollment(enr),
        onboardingToken: await currentToken(),
      } as const;
    }

    await tx`update stripe_events set enrollment_id = ${enr.id} where id = ${input.eventId}`;

    if (enr.status === 'paid') {
      return {
        ok: true,
        outcome: 'already_paid',
        enrollment: mapEnrollment(enr),
        onboardingToken: await currentToken(),
      } as const;
    }

    // 3. Advance to paid + record the billing mirror and the 6-month term window.
    const [updated] = await tx`
      update enrollments set
        status = 'paid',
        paid_at = now(),
        stripe_customer_id = ${input.stripeCustomerId},
        stripe_subscription_id = ${input.stripeSubscriptionId},
        stripe_checkout_session_id = ${input.stripeCheckoutSessionId},
        price_version = ${input.priceVersion},
        contract_start_date = current_date,
        initial_term_end_date = (current_date + interval '6 months')::date,
        updated_at = now()
      where id = ${enr.id}
      returning *`;

    // 4. Create onboarding (one per enrollment) FIRST so its token can ride on
    //    the 'paid' stage event payload below — that lets the GHL sync worker
    //    surface the onboarding link in the paid note (and the optional
    //    GHL_FIELD_ONBOARDING_URL custom field) without a second query.
    //    Prefill of the form itself happens at read time.
    const token = newOnboardingToken();
    await tx`
      insert into onboarding (enrollment_id, secure_token)
      values (${enr.id}, ${token})
      on conflict (enrollment_id) do nothing`;

    // 5. Immutable 'paid' stage event → the idempotent GHL sync tags client-paid
    //    (which triggers the onboarding workflow). Compare-and-set guarded.
    await tx`
      insert into stage_events (enrollment_id, stage, payload)
      values (${enr.id}, 'paid',
              ${tx.json(json({ subscription: input.stripeSubscriptionId, customer: input.stripeCustomerId, onboardingToken: token }))})
      on conflict (enrollment_id, stage) do nothing`;

    return {
      ok: true,
      outcome: 'applied',
      enrollment: mapEnrollment(updated),
      onboardingToken: await currentToken(),
    } as const;
  });
}

/* ─── Onboarding ───────────────────────────────────────────────────────────*/
export interface OnboardingRow {
  id: string;
  enrollmentId: string;
  secureToken: string;
  status: 'not_started' | 'in_progress' | 'submitted';
  answers: Record<string, unknown>;
  substantialInfoAt: string | null;
  fitReviewStatus: 'pending' | 'cleared' | 'flagged' | 'resolved';
  fitReviewDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapOnboarding(r: any): OnboardingRow {
  return {
    id: r.id,
    enrollmentId: r.enrollment_id,
    secureToken: r.secure_token,
    status: r.status,
    answers: r.answers ?? {},
    substantialInfoAt: r.substantial_info_at ?? null,
    fitReviewStatus: r.fit_review_status,
    fitReviewDueAt: r.fit_review_due_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getOnboardingByToken(token: string): Promise<OnboardingRow | null> {
  const sql = getSql();
  const [row] = await sql`select * from onboarding where secure_token = ${token} limit 1`;
  return row ? mapOnboarding(row) : null;
}

export async function getOnboardingByEnrollmentId(enrollmentId: string): Promise<OnboardingRow | null> {
  const sql = getSql();
  const [row] = await sql`select * from onboarding where enrollment_id = ${enrollmentId} limit 1`;
  return row ? mapOnboarding(row) : null;
}

export type SaveOnboardingResult =
  | { ok: true; onboarding: OnboardingRow }
  | { ok: false; reason: 'not_found' | 'already_submitted' };

/**
 * Save-in-progress. A shallow jsonb merge (`answers || patch`) so each save only
 * has to send the fields it knows about — earlier answers are never clobbered.
 * First save flips `not_started` → `in_progress`; a submitted row is immutable
 * here (compare-and-set — `status != 'submitted'` in the WHERE clause).
 */
export async function saveOnboardingAnswers(
  token: string,
  patch: Record<string, unknown>,
): Promise<SaveOnboardingResult> {
  const sql = getSql();
  const [row] = await sql`
    update onboarding
       set answers = answers || ${sql.json(patch as Parameters<typeof sql.json>[0])},
           status = case when status = 'not_started' then 'in_progress' else status end,
           updated_at = now()
     where secure_token = ${token} and status != 'submitted'
     returning *`;
  if (row) return { ok: true, onboarding: mapOnboarding(row) };

  const [existing] = await sql`select * from onboarding where secure_token = ${token} limit 1`;
  if (!existing) return { ok: false, reason: 'not_found' };
  return { ok: false, reason: 'already_submitted' };
}

export type SubmitOnboardingResult =
  | { ok: true; alreadySubmitted: boolean; onboarding: OnboardingRow }
  | { ok: false; reason: 'not_found' };

/**
 * Submit the completed onboarding form. This is the event that starts the
 * 7-day fit-review clock (Decision #2): `substantial_info_at` is the moment the
 * client hands over the info needed to begin, and `fit_review_due_at` is set
 * from it. Both use `coalesce` so a resubmission can never push the clock —
 * compare-and-set at the row level (locked with `for update`), matching the
 * idempotency style used across this file.
 */
export async function submitOnboarding(
  token: string,
  answers: Record<string, unknown>,
): Promise<SubmitOnboardingResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const [ob] = await tx`select * from onboarding where secure_token = ${token} for update`;
    if (!ob) return { ok: false, reason: 'not_found' } as const;

    if (ob.status === 'submitted') {
      return { ok: true, alreadySubmitted: true, onboarding: mapOnboarding(ob) } as const;
    }

    const [updated] = await tx`
      update onboarding set
        answers = answers || ${tx.json(answers as Parameters<typeof tx.json>[0])},
        status = 'submitted',
        substantial_info_at = coalesce(substantial_info_at, now()),
        fit_review_due_at = coalesce(fit_review_due_at, now() + interval '7 days'),
        updated_at = now()
      where id = ${ob.id}
      returning *`;

    // Immutable 'onboarding_submitted' stage event on the ENROLLMENT (not the
    // onboarding row) — same compare-and-set pattern the GHL sync worker relies
    // on elsewhere. A compact summary rides in the payload so the sync worker's
    // note-building never needs a second join.
    await tx`
      insert into stage_events (enrollment_id, stage, payload)
      values (${ob.enrollment_id}, 'onboarding_submitted',
              ${tx.json({
                primaryGoal: (answers as Record<string, unknown>).primaryGoal ?? null,
                timeline: (answers as Record<string, unknown>).timeline ?? null,
                targetCustomer: String((answers as Record<string, unknown>).targetCustomer ?? '').slice(0, 300),
              } as Parameters<typeof tx.json>[0])})
      on conflict (enrollment_id, stage) do nothing`;

    return { ok: true, alreadySubmitted: false, onboarding: mapOnboarding(updated) } as const;
  });
}

export type FitReviewStatus = 'pending' | 'cleared' | 'flagged' | 'resolved';

/**
 * Flip the human fit-review decision (Decision #2: internal, qualitative — not
 * automated). Accepts either identifier so the admin call can use whichever the
 * operator has on hand (the enrollment's secure id, or the onboarding token).
 */
export async function setFitReviewStatus(
  identifier: { enrollmentSecureId?: string; onboardingToken?: string },
  status: FitReviewStatus,
): Promise<OnboardingRow | null> {
  const sql = getSql();
  let row: any;
  if (identifier.onboardingToken) {
    [row] = await sql`
      update onboarding set fit_review_status = ${status}, updated_at = now()
       where secure_token = ${identifier.onboardingToken}
       returning *`;
  } else if (identifier.enrollmentSecureId) {
    [row] = await sql`
      update onboarding o set fit_review_status = ${status}, updated_at = now()
       from enrollments e
       where o.enrollment_id = e.id and e.secure_id = ${identifier.enrollmentSecureId}
       returning o.*`;
  }
  return row ? mapOnboarding(row) : null;
}

/* ─── Contact messages ─────────────────────────────────────────────────────*/
export interface ContactMessageInput {
  name: string;
  business?: string;
  email: string;
  phone?: string;
  purpose: string;
  message: string;
  ip: string | null;
  userAgent: string | null;
}

export async function insertContactMessage(input: ContactMessageInput): Promise<{ id: string }> {
  const sql = getSql();
  const [row] = await sql`
    insert into contact_messages (name, business, email, phone, purpose, message, ip, user_agent)
    values (${input.name}, ${input.business ?? null}, ${input.email}, ${input.phone ?? null},
            ${input.purpose}, ${input.message}, ${input.ip}, ${input.userAgent})
    returning id`;
  return { id: row.id };
}

/* ─── Strategy Call pre-booking qualifier ──────────────────────────────────
   Standalone per-submission record (no state machine) — modeled on
   contact_messages. Never gates the calendar (Decision #3). */
export interface StrategyCallInquiryInput {
  contactName: string;
  businessName: string;
  email: string;
  phone: string;
  answers: StrategyQualifierAnswers;
  goal: string;
  anythingElse?: string;
  ip: string | null;
  userAgent: string | null;
}

export async function insertStrategyCallInquiry(
  input: StrategyCallInquiryInput,
): Promise<{ id: string }> {
  const sql = getSql();
  const [row] = await sql`
    insert into strategy_call_inquiries
      (contact_name, business_name, email, phone, answers, goal, anything_else, ip, user_agent)
    values
      (${input.contactName}, ${input.businessName}, ${input.email}, ${input.phone},
       ${sql.json(input.answers as Parameters<typeof sql.json>[0])}, ${input.goal},
       ${input.anythingElse ?? null}, ${input.ip}, ${input.userAgent})
    returning id`;
  return { id: row.id };
}

/* ─── Subscription lifecycle (Chat 4 hardening) ────────────────────────────
   The original webhook only ever listened for checkout.session.completed —
   it had no idea if a subscription later got cancelled or a renewal payment
   failed. These two events close that gap, using the SAME idempotent
   stripe_events claim + compare-and-set pattern as recordStripePayment(). */

export type SubscriptionEventResult =
  | { ok: true; outcome: 'applied' | 'duplicate_event'; enrollment: Enrollment }
  | { ok: false; reason: 'enrollment_not_found' };

/**
 * customer.subscription.deleted → the initial term ended or the client
 * cancelled. Marks the enrollment cancelled (does not touch onboarding/
 * fit-review state) and lets the sync worker tag GHL so the CRM reflects it.
 */
export async function recordSubscriptionCancelled(input: {
  eventId: string;
  eventType: string;
  stripeSubscriptionId: string;
  payload?: unknown;
}): Promise<SubscriptionEventResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const json = (v: unknown) => v as Parameters<typeof tx.json>[0];
    const claimed = await tx`
      insert into stripe_events (id, type, payload)
      values (${input.eventId}, ${input.eventType}, ${tx.json(json(input.payload ?? {}))})
      on conflict (id) do nothing
      returning id`;
    if (claimed.length === 0) {
      const [enr] = await tx`
        select * from enrollments where stripe_subscription_id = ${input.stripeSubscriptionId} limit 1`;
      if (!enr) return { ok: false, reason: 'enrollment_not_found' } as const;
      return { ok: true, outcome: 'duplicate_event', enrollment: mapEnrollment(enr) } as const;
    }

    const [enr] = await tx`
      select * from enrollments where stripe_subscription_id = ${input.stripeSubscriptionId} for update`;
    if (!enr) return { ok: false, reason: 'enrollment_not_found' } as const;

    await tx`update stripe_events set enrollment_id = ${enr.id} where id = ${input.eventId}`;

    const [updated] = await tx`
      update enrollments set
        status = case when status != 'cancelled' then 'cancelled' else status end,
        cancelled_at = coalesce(cancelled_at, now()),
        updated_at = now()
      where id = ${enr.id}
      returning *`;

    await tx`
      insert into stage_events (enrollment_id, stage, payload)
      values (${enr.id}, 'cancelled', ${tx.json(json({ subscription: input.stripeSubscriptionId }))})
      on conflict (enrollment_id, stage) do nothing`;

    return { ok: true, outcome: 'applied', enrollment: mapEnrollment(updated) } as const;
  });
}

/**
 * invoice.payment_failed → a renewal charge bounced. Does NOT flip the
 * enrollment's status (Stripe/GHL retry dunning on their own schedule and the
 * subscription may recover) — just records the fact + count so the
 * reconciliation report can surface accounts at risk, and lets GHL tag it for
 * visibility. A distinct failed invoice on the same subscription is a new
 * Stripe event id, so each failure creates its own (idempotent) note.
 */
export async function recordPaymentFailed(input: {
  eventId: string;
  eventType: string;
  stripeSubscriptionId: string;
  payload?: unknown;
}): Promise<SubscriptionEventResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const json = (v: unknown) => v as Parameters<typeof tx.json>[0];
    const claimed = await tx`
      insert into stripe_events (id, type, payload)
      values (${input.eventId}, ${input.eventType}, ${tx.json(json(input.payload ?? {}))})
      on conflict (id) do nothing
      returning id`;
    if (claimed.length === 0) {
      const [enr] = await tx`
        select * from enrollments where stripe_subscription_id = ${input.stripeSubscriptionId} limit 1`;
      if (!enr) return { ok: false, reason: 'enrollment_not_found' } as const;
      return { ok: true, outcome: 'duplicate_event', enrollment: mapEnrollment(enr) } as const;
    }

    const [enr] = await tx`
      select * from enrollments where stripe_subscription_id = ${input.stripeSubscriptionId} for update`;
    if (!enr) return { ok: false, reason: 'enrollment_not_found' } as const;

    await tx`update stripe_events set enrollment_id = ${enr.id} where id = ${input.eventId}`;

    const [updated] = await tx`
      update enrollments set
        payment_failed_at = now(),
        payment_failed_count = payment_failed_count + 1,
        updated_at = now()
      where id = ${enr.id}
      returning *`;

    // Not unique-guarded by (enrollment_id, stage) since repeated failures on
    // the same subscription are each a genuinely new event — key on the
    // Stripe event id instead (already claimed above) so every failure still
    // gets exactly one GHL note via a distinct stage_events row.
    await tx`
      insert into stage_events (enrollment_id, stage, payload)
      values (${enr.id}, ${'payment_failed_' + input.eventId},
              ${tx.json(json({ subscription: input.stripeSubscriptionId, failedCount: updated.payment_failed_count }))})
      on conflict (enrollment_id, stage) do nothing`;

    return { ok: true, outcome: 'applied', enrollment: mapEnrollment(updated) } as const;
  });
}

/* ─── Reconciliation report (Chat 4 hardening) ─────────────────────────────
   Read-only. Surfaces drift the request-path best-effort sync can't self-heal:
   payments Stripe confirmed that never matched an enrollment, checkouts that
   started but never confirmed, and syncs that have been failing repeatedly.
   Never mutates anything — a human (or a future automated alert) decides what
   to do with what it finds. */
export interface ReconciliationReport {
  unmatchedStripeEvents: Array<{ id: string; type: string; receivedAt: string }>;
  staleAwaitingPayment: Array<{ secureId: string; businessName: string; email: string; updatedAt: string }>;
  stuckSyncs: Array<{
    enrollmentId: string;
    stage: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }>;
  stuckContactMessages: Array<{ id: string; email: string; syncError: string | null; createdAt: string }>;
  stuckStrategyCallInquiries: Array<{ id: string; email: string; syncError: string | null; createdAt: string }>;
  /** Paid enrollments whose Stripe subscription never got its fixed-term
   *  cancel_at set — these would silently auto-renew if not corrected. */
  paidWithoutCancelAt: Array<{
    secureId: string;
    businessName: string;
    stripeSubscriptionId: string | null;
    billingKey: string;
    paidAt: string | null;
  }>;
}

export async function getReconciliationReport(): Promise<ReconciliationReport> {
  const sql = getSql();

  // Stripe confirmed a payment (event recorded) but it never matched an
  // enrollment (bad/missing client_reference_id) — money moved with no linked
  // record. Highest-priority item in this report.
  const unmatchedStripeEvents = await sql`
    select id, type, received_at from stripe_events
     where enrollment_id is null
     order by received_at desc
     limit 50`;

  // Checkout session created (awaiting_payment) more than 24h ago with no
  // webhook confirmation since — likely an abandoned checkout, but also the
  // shape a lost webhook delivery would take. Worth a manual Stripe-dashboard
  // cross-check before assuming "just abandoned."
  const staleAwaitingPayment = await sql`
    select secure_id, business_name, email, updated_at from enrollments
     where status = 'awaiting_payment'
       and updated_at < now() - interval '24 hours'
     order by updated_at asc
     limit 50`;

  // GHL sync events that have failed repeatedly and are still sitting in
  // 'error' — the per-enrollment ordering guard means every later event for
  // that enrollment is also blocked behind it.
  const stuckSyncs = await sql`
    select enrollment_id, stage, sync_attempts, last_error, created_at from stage_events
     where sync_status = 'error' and sync_attempts >= 3
     order by created_at asc
     limit 50`;

  const stuckContactMessages = await sql`
    select id, email, sync_error, created_at from contact_messages
     where sync_error is not null and synced_at is null
     order by created_at asc
     limit 50`;

  const stuckStrategyCallInquiries = await sql`
    select id, email, sync_error, created_at from strategy_call_inquiries
     where sync_error is not null and synced_at is null
     order by created_at asc
     limit 50`;

  // Paid, but the fixed-term cap never landed on the Stripe subscription. Left
  // uncorrected these would auto-renew — the one thing the interim model must
  // never do. The webhook sets it; this catches any that slipped through.
  const paidWithoutCancelAt = await sql`
    select secure_id, business_name, stripe_subscription_id, billing_key, paid_at from enrollments
     where status = 'paid' and subscription_cancel_at is null
     order by paid_at asc
     limit 50`;

  return {
    unmatchedStripeEvents: unmatchedStripeEvents.map((r: any) => ({
      id: r.id,
      type: r.type,
      receivedAt: r.received_at,
    })),
    staleAwaitingPayment: staleAwaitingPayment.map((r: any) => ({
      secureId: r.secure_id,
      businessName: r.business_name,
      email: r.email,
      updatedAt: r.updated_at,
    })),
    stuckSyncs: stuckSyncs.map((r: any) => ({
      enrollmentId: r.enrollment_id,
      stage: r.stage,
      attempts: r.sync_attempts,
      lastError: r.last_error,
      createdAt: r.created_at,
    })),
    stuckContactMessages: stuckContactMessages.map((r: any) => ({
      id: r.id,
      email: r.email,
      syncError: r.sync_error,
      createdAt: r.created_at,
    })),
    stuckStrategyCallInquiries: stuckStrategyCallInquiries.map((r: any) => ({
      id: r.id,
      email: r.email,
      syncError: r.sync_error,
      createdAt: r.created_at,
    })),
    paidWithoutCancelAt: paidWithoutCancelAt.map((r: any) => ({
      secureId: r.secure_id,
      businessName: r.business_name,
      stripeSubscriptionId: r.stripe_subscription_id,
      billingKey: r.billing_key,
      paidAt: r.paid_at,
    })),
  };
}
