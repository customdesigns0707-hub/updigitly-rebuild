-- Updigitly interim launch — customer.subscription.updated sync. Postgres (Supabase).
-- ADDITIVE + idempotent: safe to run on top of schema.sql, schema-chat3.sql,
-- schema-chat4.sql, schema-strategycall.sql, and schema-interim.sql, repeatedly.
--
-- Mirrors Stripe's own subscription-lifecycle fields (status, cancel_at_period_end,
-- current period window, and the active price) so a subscription.updated webhook
-- can keep our record current WITHOUT touching enrollments.status (that stays
-- exclusively owned by checkout.session.completed → 'paid' and
-- customer.subscription.deleted → 'cancelled') or any frozen legal evidence.

alter table enrollments add column if not exists stripe_subscription_status         text;
alter table enrollments add column if not exists subscription_cancel_at_period_end boolean not null default false;
alter table enrollments add column if not exists subscription_canceled_at          timestamptz;
alter table enrollments add column if not exists subscription_current_period_start timestamptz;
alter table enrollments add column if not exists subscription_current_period_end   timestamptz;

-- The Stripe price id currently on the subscription. When it doesn't match any of
-- our known lookup_keys (PLAN_TERM_LOOKUP), stripe_price_unrecognized_id is set
-- instead of silently guessing at plan_key/billing_key — surfaced for reconcile.
alter table enrollments add column if not exists stripe_price_id                text;
alter table enrollments add column if not exists stripe_price_unrecognized_id   text;

alter table enrollments add column if not exists subscription_synced_at timestamptz;

create index if not exists enrollments_unrecognized_price_idx
  on enrollments (stripe_price_unrecognized_id)
  where stripe_price_unrecognized_id is not null;
