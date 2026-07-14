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
        (enrollment_id, disclosure_version, price_snapshot, acceptance_text, ip, user_agent)
      values
        (${enr.id}, ${input.disclosureVersion},
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

    // 4. Immutable 'paid' stage event → the idempotent GHL sync tags client-paid
    //    (which triggers the onboarding workflow). Compare-and-set guarded.
    await tx`
      insert into stage_events (enrollment_id, stage, payload)
      values (${enr.id}, 'paid',
              ${tx.json(json({ subscription: input.stripeSubscriptionId, customer: input.stripeCustomerId }))})
      on conflict (enrollment_id, stage) do nothing`;

    // 5. Create onboarding (one per enrollment). Prefill happens at read time.
    const token = newOnboardingToken();
    await tx`
      insert into onboarding (enrollment_id, secure_token)
      values (${enr.id}, ${token})
      on conflict (enrollment_id) do nothing`;

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
