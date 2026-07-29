-- Updigitly interim-launch stage — approval-before-payment, agreement evidence,
-- and fixed-term (no auto-renewal) billing. Postgres (Supabase).
-- ADDITIVE + idempotent: safe to run on top of schema.sql, schema-chat3.sql,
-- schema-chat4.sql, and schema-strategycall.sql, repeatedly.
--
-- Implements the LOCKED interim legal architecture (2026-07-28):
--   • two-path approval-before-payment (operator-controlled boolean gate),
--   • record which Agreement version the client accepted,
--   • record when Stripe will stop billing (cancel_at), so fixed-term is auditable.

-- 1. Approval-before-payment gate. Every enrollment must be approved by Updigitly
--    before the checkout button unlocks. Cold-call = operator approves live
--    (immediate); unassisted inbound = held until a manual review. This is the
--    boolean gate — not a dashboard app.
alter table enrollments add column if not exists payment_approved      boolean not null default false;
alter table enrollments add column if not exists payment_approved_at   timestamptz;
alter table enrollments add column if not exists payment_approval_note text;

-- 2. Fixed-term stop marker. The timestamp Stripe is set to cancel the
--    subscription at (end of the final paid period). NULL while unpaid; set by
--    the webhook once the subscription exists. Lets reconciliation surface any
--    paid enrollment whose subscription never got its cancel_at (which would
--    otherwise silently auto-renew).
alter table enrollments add column if not exists subscription_cancel_at timestamptz;
create index if not exists enrollments_missing_cancel_idx
  on enrollments (paid_at)
  where status = 'paid' and subscription_cancel_at is null;

-- 3. Which combined Service Order + Agreement version the client accepted, kept
--    alongside the disclosure/price evidence (interim: record agreement version).
alter table disclosure_acceptances add column if not exists agreement_version text;
