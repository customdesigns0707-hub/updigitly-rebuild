/**
 * Postgres client (Supabase-compatible). The canonical enrollment / disclosure
 * / audit store — the legal + evidence layer, never GHL (Decision #4).
 *
 * Uses a plain Postgres connection string (`DATABASE_URL`) rather than the
 * Supabase JS/PostgREST client on purpose: the idempotent sync worker needs
 * real transactions + row locks (SELECT … FOR UPDATE), which are awkward
 * through PostgREST. The same code runs against a local Postgres in dev and
 * Supabase's pooled connection string in prod.
 *
 * Import this ONLY from server code (API routes, server components, scripts).
 */
import 'server-only';
import postgres, { type Sql } from 'postgres';
import { db as dbEnv } from './env';

declare global {
  // Reuse one pool across HMR reloads in dev.
  // eslint-disable-next-line no-var
  var __updigitlySql: Sql | undefined;
}

function create(): Sql {
  if (!dbEnv.url) {
    throw new Error(
      'DATABASE_URL is not set. Add the Supabase (or local Postgres) connection ' +
        'string to .env.local — the enrollment store cannot run without it.',
    );
  }
  const local = /localhost|127\.0\.0\.1/.test(dbEnv.url);
  return postgres(dbEnv.url, {
    // Supabase requires TLS; local dev Postgres typically has none.
    ssl: local ? false : 'require',
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // safe with Supabase's transaction pooler (PgBouncer)
  });
}

/** Lazily-created shared pool. Throws only when first USED without DATABASE_URL,
 *  so the module can be imported during build with no credentials present. */
export function getSql(): Sql {
  if (!global.__updigitlySql) {
    global.__updigitlySql = create();
  }
  return global.__updigitlySql;
}

/** Convenience: is a database configured at all? Callers can branch to a safe
 *  "not configured" response instead of throwing. */
export const dbConfigured = dbEnv.isConfigured;
