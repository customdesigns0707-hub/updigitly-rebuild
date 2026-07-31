/**
 * GET|POST /api/sync — the reconciliation worker (cron).
 *
 * Drains every enrollment with pending/error stage events, every unsynced
 * contact message, and every unsynced strategy-call inquiry, idempotently
 * (Decision #4). Safe to call repeatedly and on a
 * schedule — the compare-and-set / last_processed gates make re-runs no-ops once
 * caught up. This is the safety net behind the best-effort sync in the request
 * path (so a GHL outage during a submission self-heals on the next tick).
 *
 * Guard: `Authorization: Bearer <SYNC_SECRET>` (operator calls) OR
 * `Bearer <CRON_SECRET>` (Vercel's own auto-attached cron token — see
 * src/lib/env.ts). When neither is set it is allowed only in local dev, and
 * refused in production.
 *
 * Chat 4 hardening: after draining, also runs the read-only reconciliation
 * report (see /api/admin/reconcile) and logs a warning when it finds
 * anything, so drift the drain itself can't fix (unmatched Stripe events,
 * stale awaiting_payment, stuck syncs) surfaces in the daily cron's Vercel
 * function logs without a separate scheduled job or exposed secret.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { drainSyncQueue, drainContactMessages, drainStrategyCallInquiries } from '@/lib/ghl/sync';
import { dbConfigured } from '@/lib/db';
import { sync as syncEnv, cronSecret, isDev } from '@/lib/env';
import { getReconciliationReport } from '@/lib/repo';
import { clientIp } from '@/lib/request';
import { checkRateLimit, rateLimitedResponse } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  if (!syncEnv.secret && !cronSecret) return isDev; // neither secret set → dev-only
  const header = req.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  return (!!syncEnv.secret && bearer === syncEnv.secret) || (!!cronSecret && bearer === cronSecret);
}

async function run(req: NextRequest) {
  const rateLimit = await checkRateLimit(clientIp(req), 'sync');
  if (rateLimit.limited) return rateLimitedResponse(rateLimit);
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const enrollments = await drainSyncQueue();
  const contacts = await drainContactMessages();
  const strategyCalls = await drainStrategyCallInquiries();

  const reconciliation = await getReconciliationReport();
  const findings =
    reconciliation.unmatchedStripeEvents.length +
    reconciliation.staleAwaitingPayment.length +
    reconciliation.stuckSyncs.length +
    reconciliation.stuckContactMessages.length +
    reconciliation.stuckStrategyCallInquiries.length;
  if (findings > 0) {
    console.warn(`[sync cron] reconciliation found ${findings} item(s) needing a look:`, reconciliation);
  }

  return NextResponse.json({ ok: true, enrollments, contacts, strategyCalls, reconciliation: { findings } });
}

export const GET = run;
export const POST = run;
