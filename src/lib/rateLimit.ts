/**
 * Per-IP, per-route rate limiting. Server-only. No new infra (no Upstash/
 * Redis) — a plain fixed-window counter in the same Postgres store everything
 * else uses (db/schema-rate-limit.sql).
 *
 * Turnstile stops bot spam but not a human hitting the endpoint directly with
 * a script; this is the backstop for that, and defense-in-depth on the
 * secret-gated admin routes (a limiter stops brute-force secret-guessing from
 * even reaching the auth check repeatedly).
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { getSql, dbConfigured } from './db';

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RETENTION_MS = 60 * 60 * 1000; // 1 hour — comfortably longer than any window in use

export interface RateLimitResult {
  limited: boolean;
  count: number;
  limit: number;
  /** Seconds until the current fixed window rolls over (for a Retry-After header). */
  retryAfterSeconds: number;
}

/**
 * Increments the (ip, route, currentWindow) counter and reports whether this
 * request pushed it over `limit`. Fails OPEN (never blocks the request) when
 * there's no IP to key on or no database configured — same posture as
 * Turnstile's dev-mode skip: this is a backstop, not the only line of
 * defense, and an outage here shouldn't take the form down with it.
 */
export async function checkRateLimit(
  ip: string | null,
  route: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
): Promise<RateLimitResult> {
  if (!ip || !dbConfigured) {
    return { limited: false, count: 0, limit, retryAfterSeconds: 0 };
  }

  const sql = getSql();
  const now = Date.now();
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const retryAfterSeconds = Math.ceil((windowStartMs + windowMs - now) / 1000);

  const [row] = await sql<{ count: number }[]>`
    insert into rate_limit_hits (ip, route, window_start, count)
    values (${ip}, ${route}, ${windowStart}, 1)
    on conflict (ip, route, window_start)
    do update set count = rate_limit_hits.count + 1
    returning count
  `;

  // Opportunistic cleanup so the table doesn't grow unbounded, without adding
  // a delete to every single request.
  if (Math.random() < 0.01) {
    void sql`delete from rate_limit_hits where window_start < ${new Date(now - RETENTION_MS)}`.catch(
      () => {},
    );
  }

  return { limited: row.count > limit, count: row.count, limit, retryAfterSeconds };
}

/** Consistent 429 shape/headers for every route that rate-limits. */
export function rateLimitedResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: 'rate_limited', retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
  );
}
