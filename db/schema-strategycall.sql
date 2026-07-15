-- Updigitly Strategy Call pre-booking qualifier — picked up from the Chat 4
-- placeholder. Postgres (Supabase). ADDITIVE + idempotent: safe to run on top
-- of db/schema.sql and db/schema-chat3.sql, repeatedly.
--
-- This is intentionally its OWN standalone table, not bolted onto
-- `enrollments` — a strategy-call inquiry has no plan, no billing, no
-- disclosure, no payment, and is never gated (Decision #3: /strategy-call is
-- also the escape hatch for unclear situations). Modeled on `contact_messages`
-- (Decision #4: each submission is a fresh, standalone record with a
-- best-effort GHL sync, not a state machine).

create table if not exists strategy_call_inquiries (
  id             uuid primary key default gen_random_uuid(),
  contact_name   text not null,
  business_name  text not null,
  email          text not null,
  phone          text not null,
  answers        jsonb not null,             -- {locations, presence, teamSize}
  goal           text not null,              -- required: "what's the goal for this call?"
  anything_else  text,
  ghl_contact_id text,
  ghl_note_id    text,
  synced_at      timestamptz,
  sync_error     text,
  ip             text,
  user_agent     text,
  created_at     timestamptz not null default now()
);
create index if not exists strategy_call_unsynced_idx
  on strategy_call_inquiries (created_at) where synced_at is null;
create index if not exists strategy_call_email_idx
  on strategy_call_inquiries (lower(email));
