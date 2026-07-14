/**
 * Idempotent GHL contact-sync worker (Decision #4). Server-only.
 *
 * The rules this implements, verbatim from the locked strategy:
 *  • Postgres owns one immutable stage_event per genuine transition. The worker
 *    processes them SEQUENTIALLY per enrollment, in id order.
 *  • Compare-and-set: it READS the current GHL contact first and writes only the
 *    diff (missing tags / changed fields) — never a blind repeated write.
 *  • It gates on `last_processed_stage_event_id`: an event at or below the marker
 *    is never re-applied, so re-runs and duplicate cron ticks are safe.
 *  • The first event upserts the contact; GHL's upsert dedupes by email/phone,
 *    so even that create step is idempotent on GHL's side.
 *  • Payment/onboarding/disclosure EVIDENCE stay Postgres-controlled — GHL only
 *    carries CRM segmentation (tags/fields) + comms (notes).
 *
 * The GHL client is injected as a `GhlPort` so the idempotency logic can be
 * unit-tested against a mock without touching the network.
 */
import 'server-only';
import { getSql } from '../db';
import { ghl } from '../env';
import * as realClient from './client';
import type { GhlContact, GhlCustomField } from './client';
import { PLANS, BILLING } from '../plans';
import { answerLabel } from '../enrollment';

export interface GhlPort {
  upsertContact(i: {
    name: string;
    email: string;
    phone: string;
    tags?: string[];
    customFields?: GhlCustomField[];
  }): Promise<{ id: string; isNew: boolean }>;
  getContact(id: string): Promise<GhlContact>;
  updateContact(id: string, patch: { tags?: string[]; customFields?: GhlCustomField[] }): Promise<void>;
  addNote(id: string, body: string): Promise<{ id: string }>;
}

const defaultPort: GhlPort = {
  upsertContact: realClient.upsertContact,
  getContact: realClient.getContact,
  updateContact: realClient.updateContact,
  addNote: realClient.addNote,
};


/** Durable segmentation tags for a stage — additive only; never removed. */
function tagsForStage(stage: string, enr: any): string[] {
  const complex = (enr.complexity_flags?.length ?? 0) > 0;
  if (stage === 'qualifier_submitted') {
    return ['enrollment-started', `plan-${enr.plan_key}`, ...(complex ? ['enrollment-complex-review'] : [])];
  }
  if (stage === 'disclosure_accepted') {
    return ['enrollment-disclosure-accepted', `plan-${enr.plan_key}`];
  }
  return [];
}

/** Desired custom-field values — only the fields whose IDs are mapped in env.
 *  Unmapped answers still reach GHL via the notes below, so nothing is lost. */
function fieldsForEnrollment(enr: any): GhlCustomField[] {
  const f = ghl.fields;
  const planName = PLANS.find((p) => p.key === enr.plan_key)?.name ?? enr.plan_key;
  const billingLabel = BILLING[enr.billing_key as keyof typeof BILLING]?.label ?? enr.billing_key;
  const q = enr.qualifier ?? {};
  const needs: string[] = Array.isArray(q.needs) ? q.needs : [];
  const pairs: Array<[string | undefined, string]> = [
    [f.plan, planName],
    [f.billing, billingLabel],
    [f.locations, answerLabel('locations', q.locations)],
    [f.website, answerLabel('website', q.website)],
    [f.crm, answerLabel('crm', q.crm)],
    [f.needs, needs.map((n) => answerLabel('needs', n)).join(', ') || 'None'],
    [f.complexity, (enr.complexity_flags ?? []).join('; ') || 'None flagged'],
  ];
  return pairs.filter(([id]) => !!id).map(([id, value]) => ({ id: id as string, value }));
}

function mergeFields(current: GhlCustomField[], desired: GhlCustomField[]): GhlCustomField[] {
  const byId = new Map(current.map((c) => [c.id, c.value]));
  for (const d of desired) byId.set(d.id, d.value);
  return Array.from(byId, ([id, value]) => ({ id, value }));
}

function qualifierNote(enr: any): string {
  const planName = PLANS.find((p) => p.key === enr.plan_key)?.name ?? enr.plan_key;
  const billingLabel = BILLING[enr.billing_key as keyof typeof BILLING]?.label ?? enr.billing_key;
  const q = enr.qualifier ?? {};
  const needs: string[] = Array.isArray(q.needs) ? q.needs : [];
  const flags: string[] = enr.complexity_flags ?? [];
  return [
    `New enrollment started via updigitly.com`,
    `Plan: ${planName} · Billing: ${billingLabel}`,
    `Business: ${enr.business_name}`,
    `Contact: ${enr.contact_name} · ${enr.email} · ${enr.phone}`,
    ``,
    `Qualifier:`,
    `• Locations/brands: ${answerLabel('locations', q.locations)}`,
    `• Website: ${answerLabel('website', q.website)}`,
    `• CRM to migrate: ${answerLabel('crm', q.crm)}`,
    `• Needs: ${needs.map((n) => answerLabel('needs', n)).join(', ') || 'None'}`,
    `• Complexity flags: ${flags.join('; ') || 'None flagged'}`,
    enr.anything_else ? `\nAnything else: ${enr.anything_else}` : ``,
  ]
    .filter(Boolean)
    .join('\n');
}

function disclosureNote(enr: any, ev: any): string {
  const p = ev.payload ?? {};
  return [
    `Commitment disclosure ACCEPTED (${p.version ?? ''})`,
    `Plan: ${p.plan ?? ''} · Billing: ${p.billing ?? ''}`,
    p.immediateCharge != null ? `Charged today: $${p.immediateCharge}` : ``,
    p.minCommitment != null ? `Minimum term obligation: $${p.minCommitment}` : ``,
    `Accepted for ${enr.business_name} (${enr.email}).`,
    `Evidence (version, price snapshot, IP, timestamp) stored in Postgres.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Apply a single stage event to GHL, compare-and-set. Returns the contact id. */
async function applyStage(enr: any, ev: any, contactId: string | null, port: GhlPort): Promise<string> {
  const desiredTags = tagsForStage(ev.stage, enr);
  const desiredFields = fieldsForEnrollment(enr);

  if (!contactId) {
    // First sync: create/match the contact (idempotent by email/phone on GHL).
    const res = await port.upsertContact({
      name: enr.contact_name,
      email: enr.email,
      phone: enr.phone,
      tags: desiredTags,
      customFields: desiredFields,
    });
    if (ev.stage === 'qualifier_submitted') await port.addNote(res.id, qualifierNote(enr));
    if (ev.stage === 'disclosure_accepted') await port.addNote(res.id, disclosureNote(enr, ev));
    return res.id;
  }

  // Subsequent syncs: READ current state first, write only the diff.
  const current = await port.getContact(contactId);
  const missingTags = desiredTags.filter((t) => !current.tags.includes(t));
  const fieldDiffs = desiredFields.filter((d) => {
    const c = current.customFields.find((x) => x.id === d.id);
    return !c || c.value !== d.value;
  });

  if (missingTags.length > 0 || fieldDiffs.length > 0) {
    await port.updateContact(contactId, {
      tags: missingTags.length ? Array.from(new Set([...current.tags, ...desiredTags])) : undefined,
      customFields: fieldDiffs.length ? mergeFields(current.customFields, desiredFields) : undefined,
    });
  }

  if (ev.stage === 'disclosure_accepted') await port.addNote(contactId, disclosureNote(enr, ev));
  return contactId;
}

export interface SyncResult {
  status: 'ok' | 'error' | 'skipped';
  reason?: string;
  synced: number;
  errored: number;
  contactId: string | null;
}

/**
 * Sync one enrollment's pending stage events. Serialized per-enrollment via a
 * `FOR UPDATE` lock on its sync-state row, so concurrent workers (cron +
 * opportunistic request-path sync) can never double-process an event.
 */
export async function syncEnrollment(enrollmentId: string, port: GhlPort = defaultPort): Promise<SyncResult> {
  if (!ghl.isConfigured) return { status: 'skipped', reason: 'ghl-not-configured', synced: 0, errored: 0, contactId: null };
  return syncEnrollmentCore(enrollmentId, port);
}

/** The un-gated core (no `isConfigured` check) so the idempotency logic can be
 *  exercised against a mock `GhlPort` in tests. Production callers use
 *  `syncEnrollment`, which adds the config gate. */
export async function syncEnrollmentCore(enrollmentId: string, port: GhlPort): Promise<SyncResult> {
  const sql = getSql();

  return sql.begin(async (tx) => {
    await tx`insert into ghl_sync_state (enrollment_id) values (${enrollmentId}) on conflict (enrollment_id) do nothing`;
    const [state] = await tx`select * from ghl_sync_state where enrollment_id = ${enrollmentId} for update`;
    const [enr] = await tx`select * from enrollments where id = ${enrollmentId}`;
    if (!enr) return { status: 'error', reason: 'enrollment-missing', synced: 0, errored: 0, contactId: null };

    const events = await tx`
      select * from stage_events
       where enrollment_id = ${enrollmentId}
         and id > ${state.last_processed_stage_event_id}
         and sync_status in ('pending','error')
       order by id asc`;

    let contactId: string | null = state.ghl_contact_id ?? enr.ghl_contact_id ?? null;
    let synced = 0;
    let errored = 0;

    for (const ev of events) {
      try {
        contactId = await applyStage(enr, ev, contactId, port);
        await tx`
          update stage_events set sync_status='synced', processed_at=now(),
                 sync_attempts=sync_attempts+1, last_error=null
           where id = ${ev.id}`;
        await tx`
          update ghl_sync_state
             set last_processed_stage_event_id=${ev.id}, last_synced_stage=${ev.stage},
                 ghl_contact_id=${contactId}, updated_at=now()
           where enrollment_id = ${enrollmentId}`;
        await tx`
          update enrollments set ghl_contact_id=${contactId}, updated_at=now()
           where id=${enrollmentId} and ghl_contact_id is distinct from ${contactId}`;
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await tx`
          update stage_events set sync_status='error', sync_attempts=sync_attempts+1, last_error=${msg}
           where id = ${ev.id}`;
        errored++;
        break; // preserve per-enrollment ordering — do not skip past a failure
      }
    }

    return { status: errored ? 'error' : 'ok', synced, errored, contactId };
  });
}

/** Drain the queue: process every enrollment that has pending/error events. */
export async function drainSyncQueue(
  limit = 50,
  port: GhlPort = defaultPort,
): Promise<{ configured: boolean; processed: number; synced: number; errored: number }> {
  if (!ghl.isConfigured) return { configured: false, processed: 0, synced: 0, errored: 0 };
  const sql = getSql();
  const rows = await sql`
    select distinct enrollment_id from stage_events
     where sync_status in ('pending','error')
     order by enrollment_id
     limit ${limit}`;

  let synced = 0;
  let errored = 0;
  for (const r of rows) {
    const res = await syncEnrollment(r.enrollment_id, port);
    synced += res.synced;
    errored += res.errored;
  }
  return { configured: true, processed: rows.length, synced, errored };
}

/* ─── Contact messages ─────────────────────────────────────────────────────
   Each /contact submission becomes a NEW GHL note (Decision #4: never rely on
   tag reapplication for repeat messages). Idempotent per-row: a message with
   synced_at set is never re-sent. */
function contactNote(m: any): string {
  return [
    `Website message — ${m.purpose}`,
    `From: ${m.name}${m.business ? ` · ${m.business}` : ''}`,
    `Email: ${m.email}${m.phone ? ` · Phone: ${m.phone}` : ''}`,
    ``,
    m.message,
  ].join('\n');
}

export async function syncContactMessage(
  messageId: string,
  port: GhlPort = defaultPort,
): Promise<{ status: 'ok' | 'error' | 'skipped'; reason?: string }> {
  if (!ghl.isConfigured) return { status: 'skipped', reason: 'ghl-not-configured' };
  const sql = getSql();
  const [m] = await sql`select * from contact_messages where id = ${messageId}`;
  if (!m) return { status: 'error', reason: 'message-missing' };
  if (m.synced_at) return { status: 'ok', reason: 'already-synced' }; // per-row idempotency

  try {
    const contact = await port.upsertContact({
      name: m.name,
      email: m.email,
      phone: m.phone ?? '',
      tags: ['website-contact-form', `contact-${String(m.purpose).toLowerCase().replace(/\s+/g, '-')}`],
    });
    const note = await port.addNote(contact.id, contactNote(m));
    await sql`
      update contact_messages
         set ghl_contact_id=${contact.id}, ghl_note_id=${note.id || null},
             synced_at=now(), sync_error=null
       where id = ${messageId}`;
    return { status: 'ok' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sql`update contact_messages set sync_error=${msg} where id = ${messageId}`;
    return { status: 'error', reason: msg };
  }
}

/** Drain unsynced contact messages (safety net for the request-path best-effort). */
export async function drainContactMessages(limit = 50, port: GhlPort = defaultPort) {
  if (!ghl.isConfigured) return { configured: false, processed: 0 };
  const sql = getSql();
  const rows = await sql`
    select id from contact_messages where synced_at is null order by created_at asc limit ${limit}`;
  for (const r of rows) await syncContactMessage(r.id, port);
  return { configured: true, processed: rows.length };
}
