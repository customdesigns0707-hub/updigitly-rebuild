-- Updigitly Phase 2 Chat 4 — hardening pass. Postgres (Supabase).
-- ADDITIVE + idempotent: safe to run on top of db/schema.sql, schema-chat3.sql,
-- and schema-strategycall.sql, repeatedly.
--
-- Adds the columns needed to track subscription lifecycle events beyond the
-- initial payment (Decision #4 rev never covered cancellation/dunning — the
-- webhook previously only listened for checkout.session.completed).

alter table enrollments add column if not exists cancelled_at         timestamptz;
alter table enrollments add column if not exists payment_failed_at    timestamptz;
alter table enrollments add column if not exists payment_failed_count int not null default 0;

-- 'cancelled' already allowed by the original status check constraint
-- (db/schema.sql). No constraint change needed.

create index if not exists enrollments_cancelled_idx
  on enrollments (cancelled_at) where cancelled_at is not null;
