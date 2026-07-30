/**
 * Integration test for recordSubscriptionUpdated() (customer.subscription.updated
 * sync). Hits the real dev/test Postgres via DATABASE_URL — creates a disposable
 * fixture enrollment, feeds it two synthetic event payloads (cancel_at_period_end
 * true then false, same cancel_at both times), and asserts:
 *   - the boolean syncs correctly on each call,
 *   - subscription_cancel_at (the fixed-term cap) is never altered by a boolean
 *     toggle alone — it only ever reflects whatever cancelAt the caller passes,
 *   - enrollments.status is never touched,
 *   - no stage_events are created beyond the one from enrollment creation,
 *   - the fixture is cleaned up regardless of pass/fail.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSql } from './db';
import { createEnrollment, recordSubscriptionUpdated } from './repo';

const FIXTURE_SUB_ID = 'sub_test_fixture_subscription_updated';
const EVENT_ID_TRUE = 'evt_test_fixture_cancel_at_period_end_true';
const EVENT_ID_FALSE = 'evt_test_fixture_cancel_at_period_end_false';
const FIXED_CANCEL_AT = new Date('2027-01-30T12:00:00.000Z');

describe('recordSubscriptionUpdated', () => {
  let enrollmentId: string;
  let secureId: string;

  beforeAll(async () => {
    const sql = getSql();
    const enrollment = await createEnrollment({
      plan: 'essential',
      billing: 'monthly',
      contactName: 'Fixture Test',
      businessName: 'Vitest Fixture Co',
      email: 'vitest-fixture@example.com',
      phone: '5205550000',
      answers: { locations: 'one', website: 'performs', crm: 'none', needs: [] },
    });
    enrollmentId = enrollment.id;
    secureId = enrollment.secureId;

    // Simulate a completed checkout: paid, with the fixed-term cap already set
    // (exactly what ensureFixedTermCancel would have written).
    await sql`
      update enrollments set
        status = 'paid',
        stripe_subscription_id = ${FIXTURE_SUB_ID},
        subscription_cancel_at = ${FIXED_CANCEL_AT}
      where id = ${enrollmentId}`;
  });

  afterAll(async () => {
    const sql = getSql();
    await sql`delete from enrollments where id = ${enrollmentId}`;
    await sql`delete from stripe_events where id in (${EVENT_ID_TRUE}, ${EVENT_ID_FALSE})`;
  });

  it('applies cancel_at_period_end=true while preserving the fixed-term cancel_at', async () => {
    const result = await recordSubscriptionUpdated({
      eventId: EVENT_ID_TRUE,
      eventType: 'customer.subscription.updated',
      stripeSubscriptionId: FIXTURE_SUB_ID,
      status: 'active',
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      currentPeriodStart: new Date('2026-07-30T12:00:00.000Z'),
      currentPeriodEnd: FIXED_CANCEL_AT,
      cancelAt: FIXED_CANCEL_AT, // unchanged from what's already on the row
      priceId: 'price_essential_monthly_fixture',
      recognizedPlan: { planKey: 'essential', billingKey: 'monthly' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('applied');
    expect(result.enrollment.subscriptionCancelAtPeriodEnd).toBe(true);
    expect(new Date(result.enrollment.subscriptionCancelAt as unknown as string).toISOString()).toBe(FIXED_CANCEL_AT.toISOString());
    expect(result.enrollment.status).toBe('paid'); // untouched

    const sql = getSql();
    const stages = await sql`select count(*)::int as n from stage_events where enrollment_id = ${enrollmentId}`;
    expect(stages[0].n).toBe(1); // only the qualifier_submitted event from createEnrollment
  });

  it('applies cancel_at_period_end=false while still preserving the fixed-term cancel_at', async () => {
    const result = await recordSubscriptionUpdated({
      eventId: EVENT_ID_FALSE,
      eventType: 'customer.subscription.updated',
      stripeSubscriptionId: FIXTURE_SUB_ID,
      status: 'active',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodStart: new Date('2026-07-30T12:00:00.000Z'),
      currentPeriodEnd: FIXED_CANCEL_AT,
      cancelAt: FIXED_CANCEL_AT, // still the same fixed-term date
      priceId: 'price_essential_monthly_fixture',
      recognizedPlan: { planKey: 'essential', billingKey: 'monthly' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('applied');
    expect(result.enrollment.subscriptionCancelAtPeriodEnd).toBe(false); // flipped correctly
    expect(new Date(result.enrollment.subscriptionCancelAt as unknown as string).toISOString()).toBe(FIXED_CANCEL_AT.toISOString()); // still preserved
    expect(result.enrollment.status).toBe('paid');

    const sql = getSql();
    const stages = await sql`select count(*)::int as n from stage_events where enrollment_id = ${enrollmentId}`;
    expect(stages[0].n).toBe(1); // still no new stage_events from either call

    const syncState = await sql`select updated_at from ghl_sync_state where enrollment_id = ${enrollmentId}`;
    expect(syncState).toHaveLength(1); // seeded once at creation, never touched by this handler
  });

  it('flags an unrecognized price instead of guessing at plan/billing key', async () => {
    const before = await getSql()`select plan_key, billing_key from enrollments where id = ${enrollmentId}`;

    const result = await recordSubscriptionUpdated({
      eventId: 'evt_test_fixture_unrecognized_price',
      eventType: 'customer.subscription.updated',
      stripeSubscriptionId: FIXTURE_SUB_ID,
      status: 'active',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodStart: new Date('2026-07-30T12:00:00.000Z'),
      currentPeriodEnd: FIXED_CANCEL_AT,
      cancelAt: FIXED_CANCEL_AT,
      priceId: 'price_some_manually_created_price_not_in_our_seed',
      recognizedPlan: null, // simulates an unrecognized lookup_key
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.enrollment.stripePriceUnrecognizedId).toBe('price_some_manually_created_price_not_in_our_seed');
    expect(result.enrollment.planKey).toBe(before[0].plan_key); // unchanged, not guessed at
    expect(result.enrollment.billingKey).toBe(before[0].billing_key);

    await getSql()`delete from stripe_events where id = 'evt_test_fixture_unrecognized_price'`;
  });

  it('is idempotent on a duplicate event id', async () => {
    const result = await recordSubscriptionUpdated({
      eventId: EVENT_ID_TRUE, // reuse the first test's event id
      eventType: 'customer.subscription.updated',
      stripeSubscriptionId: FIXTURE_SUB_ID,
      status: 'canceled', // deliberately different payload — must NOT apply
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAt: null,
      priceId: null,
      recognizedPlan: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('duplicate_event');
    // Unchanged from whatever the last APPLIED call left it as (false, from test 2)
    expect(result.enrollment.subscriptionCancelAtPeriodEnd).toBe(false);
  });
});
