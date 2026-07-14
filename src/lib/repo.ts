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
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Unguessable, URL-safe token for the enrollment's private review URL. */
export function newSecureId(): string {
  return randomBytes(18).toString('base64url'); // 24 chars, ~144 bits
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
