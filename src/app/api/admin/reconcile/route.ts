/**
 * GET /api/admin/reconcile — read-only drift report (Chat 4 hardening).
 *
 * The request-path best-effort GHL sync and the daily /api/sync cron drain
 * self-heal ordinary transient failures, but neither one can tell a human
 * "this needs a look." This surfaces the drift that actually matters:
 *  - Stripe events that never matched an enrollment (money moved, no record)
 *  - checkouts stuck in awaiting_payment for >24h with no webhook since
 *  - GHL syncs that have failed repeatedly and are stuck behind the
 *    per-enrollment ordering guard
 *  - contact-form / strategy-call submissions that failed to sync to GHL
 *
 * Never mutates anything. SYNC_SECRET-gated, same `authorized()` pattern as
 * every other /api/admin/* route (dev-open only when the secret is unset).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { sync as syncEnv, isDev } from '@/lib/env';
import { dbConfigured } from '@/lib/db';
import { getReconciliationReport } from '@/lib/repo';
import { clientIp } from '@/lib/request';
import { checkRateLimit, rateLimitedResponse } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  if (!syncEnv.secret) return isDev;
  const header = req.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  return bearer === syncEnv.secret;
}

export async function GET(req: NextRequest) {
  const rateLimit = await checkRateLimit(clientIp(req), 'admin-reconcile');
  if (rateLimit.limited) return rateLimitedResponse(rateLimit);
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const report = await getReconciliationReport();
  const totalFindings =
    report.unmatchedStripeEvents.length +
    report.staleAwaitingPayment.length +
    report.stuckSyncs.length +
    report.stuckContactMessages.length +
    report.stuckStrategyCallInquiries.length +
    report.paidWithoutCancelAt.length +
    report.unrecognizedPrices.length;

  return NextResponse.json({ ok: true, clean: totalFindings === 0, totalFindings, ...report });
}
