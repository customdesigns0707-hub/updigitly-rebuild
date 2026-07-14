-- Updigitly enrollment / disclosure / audit store — Phase 2 Chat 2.
-- Postgres (Supabase). CANONICAL business-state store (Decision #4).
-- Idempotent: safe to run repeatedly (CREATE … IF NOT EXISTS throughout).

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- 1. enrollments — one row per qualifier submission (the entity everything hangs off).
create table if not exists enrollments (
  id                uuid primary key default gen_random_uuid(),
  secure_id         text unique not null,                 -- unguessable URL token
  plan_key          text not null
                       check (plan_key in ('essential','growth-engine')),
  billing_key       text not null default 'monthly'
                       check (billing_key in ('monthly','sixPrepaid','annualPrepaid')),
  status            text not null default 'qualifier_submitted'
                       check (status in ('qualifier_submitted','disclosure_accepted',
                                         'awaiting_payment','paid','cancelled')),
  contact_name      text not null,
  business_name     text not null,
  email             text not null,
  phone             text not null,
  qualifier         jsonb not null,                       -- {locations,website,crm,needs[]}
  anything_else     text,
  complexity_flags  jsonb not null default '[]'::jsonb,   -- string[] of soft signals
  ghl_contact_id    text,                                 -- mirror of sync_state for convenience
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists enrollments_email_idx  on enrollments (lower(email));
create index if not exists enrollments_status_idx on enrollments (status);

-- 2. disclosure_acceptances — immutable evidence of exactly what was shown +
--    accepted, with the frozen price snapshot. The legal record (Decision #4).
create table if not exists disclosure_acceptances (
  id                 uuid primary key default gen_random_uuid(),
  enrollment_id      uuid not null references enrollments(id) on delete cascade,
  disclosure_version text not null,
  price_snapshot     jsonb not null,        -- full frozen money view at accept time
  acceptance_text    text not null,         -- exact fair-resolution + summary shown
  accepted_at        timestamptz not null default now(),
  ip                 text,
  user_agent         text
);
create index if not exists disclosure_enrollment_idx
  on disclosure_acceptances (enrollment_id);

-- 3. stage_events — immutable log, ONE row per genuine stage transition.
--    Drives the idempotent GHL sync worker. bigserial = per-enrollment
--    monotonic ordering for the last_processed_stage_event_id gate (Decision #4).
create table if not exists stage_events (
  id             bigserial primary key,
  enrollment_id  uuid not null references enrollments(id) on delete cascade,
  stage          text not null,
  payload        jsonb not null default '{}'::jsonb,
  sync_status    text not null default 'pending'
                    check (sync_status in ('pending','synced','skipped','error')),
  sync_attempts  int  not null default 0,
  last_error     text,
  created_at     timestamptz not null default now(),
  processed_at   timestamptz
);
-- Compare-and-set guard: a replayed transition can never enqueue a duplicate.
create unique index if not exists stage_events_enrollment_stage_uidx
  on stage_events (enrollment_id, stage);
create index if not exists stage_events_pending_idx
  on stage_events (enrollment_id, id) where sync_status in ('pending','error');

-- 4. ghl_sync_state — per-enrollment compare-and-set marker (Decision #4).
create table if not exists ghl_sync_state (
  enrollment_id                 uuid primary key references enrollments(id) on delete cascade,
  ghl_contact_id                text,
  last_processed_stage_event_id bigint not null default 0,
  last_synced_stage             text,
  updated_at                    timestamptz not null default now()
);

-- 5. contact_messages — /contact submissions. Each makes a NEW GHL note
--    (Decision #4: no reliance on tag reapplication for repeat messages).
create table if not exists contact_messages (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  business       text,
  email          text not null,
  phone          text,
  purpose        text not null,
  message        text not null,
  ghl_contact_id text,
  ghl_note_id    text,
  synced_at      timestamptz,
  sync_error     text,
  ip             text,
  user_agent     text,
  created_at     timestamptz not null default now()
);
create index if not exists contact_unsynced_idx
  on contact_messages (created_at) where synced_at is null;
