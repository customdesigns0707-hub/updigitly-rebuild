-- Updigitly security hardening — per-IP rate limiting. Postgres (Supabase).
-- ADDITIVE + idempotent: safe to run on top of the other schema-*.sql files,
-- repeatedly. No new infra (Upstash/Redis) — reuses the existing Postgres
-- store with a plain fixed-window counter (see src/lib/rateLimit.ts).

create table if not exists rate_limit_hits (
  ip           text        not null,
  route        text        not null,
  window_start timestamptz not null,
  count        int         not null default 1,
  primary key (ip, route, window_start)
);

-- Backs the periodic cleanup delete in src/lib/rateLimit.ts (stale windows).
create index if not exists rate_limit_hits_window_idx
  on rate_limit_hits (window_start);
