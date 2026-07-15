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
 * Guard: `Authorization: Bearer <SYNC_SECRET>` (or `?secret=`). When SYNC_SECRET
 * is unset it is allowed only in local dev, and refused in production.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { drainSyncQueue, drainContactMessages, drainStrategyCallInquiries } from '@/lib/ghl/sync';
import { dbConfigured } from '@/lib/db';
import { sync as syncEnv, isDev } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  if (!syncEnv.secret) return isDev; // no secret set → dev-only
  const header = req.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const q = req.nextUrl.searchParams.get('secret');
  return bearer === syncEnv.secret || q === syncEnv.secret;
}

async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const enrollments = await drainSyncQueue();
  const contacts = await drainContactMessages();
  const strategyCalls = await drainStrategyCallInquiries();
  return NextResponse.json({ ok: true, enrollments, contacts, strategyCalls });
}

export const GET = run;
export const POST = run;
