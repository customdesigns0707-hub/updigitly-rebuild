-- Updigitly Phase 2 Chat 3 — payment + onboarding. Postgres (Supabase).
-- ADDITIVE + idempotent: safe to run on top of db/schema.sql, repeatedly.
-- Stripe is the authoritative billing system; Postgres stays the canonical
-- business-state/evidence store; GHL is downstream CRM only (Decision #4 rev).

-- 1. Billing columns on the enrollment (mirror of Stripe's authoritative record,
--    kept for reconciliation + the confirmation/onboarding pages). The status
--    check already allows 'awaiting_payment' and 'paid'.
alter table enrollments add column if not exists stripe_customer_id       text;
alter table enrollments add column if not exists stripe_subscription_id   text;
alter table enrollments add column if not exists stripe_checkout_session_id text;
alter table enrollments add column if not exists paid_at                  timestamptz;
alter table enrollments add column if not exists contract_start_date      date;
alter table enrollments add column if not exists initial_term_end_date    date;
alter table enrollments add column if not exists price_version            text;
create index if not exists enrollments_stripe_customer_idx
  on enrollments (stripe_customer_id);
create unique index if not exists enrollments_stripe_session_uidx
  on enrollments (stripe_checkout_session_id) where stripe_checkout_session_id is not null;

-- 2. stripe_events — one row per PROCESSED Stripe event id. Inserted inside the
--    same transaction that applies the event, so a duplicate webhook delivery
--    (same evt_… id) is a guaranteed no-op and a mid-way failure rolls back and
--    can safely reprocess. This is the webhook idempotency spine.
create table if not exists stripe_events (
  id             text primary key,                 -- Stripe event id (evt_…)
  type           text not null,
  enrollment_id  uuid references enrollments(id) on delete set null,
  received_at    timestamptz not null default now(),
  payload        jsonb
);
create index if not exists stripe_events_enrollment_idx on stripe_events (enrollment_id);

-- 3. onboarding — created the moment payment is confirmed. Prefilled from the
--    qualifier (nothing re-asked). `substantial_info_at` is the date the client
--    hands over the info needed to begin — it STARTS the 7-day fit-review clock
--    (Decision #2). Fit review must clear before heavy build.
create table if not exists onboarding (
  id                   uuid primary key default gen_random_uuid(),
  enrollment_id        uuid not null unique references enrollments(id) on delete cascade,
  secure_token         text unique not null,          -- unguessable /onboarding/[token]
  status               text not null default 'not_started'
                          check (status in ('not_started','in_progress','submitted')),
  answers              jsonb not null default '{}'::jsonb,
  substantial_info_at  timestamptz,                    -- starts the fit-review clock
  fit_review_status    text not null default 'pending'
                          check (fit_review_status in ('pending','cleared','flagged','resolved')),
  fit_review_due_at    timestamptz,                    -- substantial_info_at + 7 days
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists onboarding_token_idx on onboarding (secure_token);
