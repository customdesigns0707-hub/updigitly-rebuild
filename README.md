# updigitly-rebuild — Phase 2 (Chat 1 Foundation + Chat 2 Enrollment/Data)

Fresh Next.js 14 rebuild of the Updigitly site. Signal design system ported
verbatim; message/pricing/structure rebuilt per the LOCKED Phase 1 strategy.
Chat 1 built the foundation shell; Chat 2 added the native enrollment + data
layer (qualifier → Postgres → loud disclosure → confirmation + idempotent GHL
sync + native contact form). PAYMENT is Chat 3 — no checkout logic here. Do not
run the Phase 3 domain flip from here.

## Run
    npm install
    npm run dev        # http://localhost:3000
    npm run build      # production build
    npm run typecheck  # tsc --noEmit

Note: fonts load via <link> from Google Fonts at runtime — a `next build` in a
network-restricted sandbox logs a harmless "Failed to minify … fonts.googleapis"
warning and skips font optimization. It builds and renders fine on Vercel.

## Environment (Chat 2)
Copy `.env.example` → `.env.local` (local) and set the same keys in Vercel for
preview/prod. EVERYTHING degrades safely when a key is absent — the app builds
and the UI runs with them blank; each integration exposes an `isConfigured`
flag and no-ops or defers when unset.

- `DATABASE_URL` — Postgres (Supabase) connection string. THE canonical store.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` — Cloudflare
  Turnstile. Verification is SKIPPED (and the widget hides) when unset.
- `GHL_API_TOKEN` / `GHL_LOCATION_ID` (+ optional custom-field / pipeline IDs) —
  GoHighLevel. Sync is DEFERRED (events stay pending for the cron) when unset.
- `SYNC_SECRET` — bearer guarding `POST /api/sync` (the reconciliation cron).

### Database
Apply the schema (idempotent):

    node --env-file=.env.local scripts/migrate.mjs

Schema lives in `db/schema.sql`. Tables: enrollments, disclosure_acceptances,
stage_events, ghl_sync_state, contact_messages.

## Routes
- `/`                          Home — routing engine
- `/system`                    The System — persuasion depth
- `/pricing`                   Pricing — presentation (billing selector → enroll)
- `/strategy-call`             Strategy Call — shell (calendar/qualifier = Chat 3)
- `/contact`                   Contact — NATIVE message form (Chat 2)
- `/legal`                     Legal scaffold (counsel review pending — flip gate)
- `/enroll/[token]`            Enrollment entry (token = essential | growth-engine)
                               → native qualifier
- `/enroll/[token]/review`     Commitment/disclosure review (token = secure-id)
                               → loud disclosure + accept; checkout = Chat 3
- `/enroll/confirmation?ref=`  Confirmation (payment-gating = Chat 3)

The dynamic segment is named `[token]` for both the plan-entry and the
`/review` routes — Next.js forbids two different slug names at the same path
position, and the URLs are identical to the locked spec.

## API
- `POST /api/enroll`             qualifier submit → persist → best-effort sync
- `POST /api/enroll/[id]/billing`  switch billing before acceptance (locks after)
- `POST /api/enroll/[id]/accept`   record disclosure acceptance (evidence) + sync
- `POST /api/contact`            message form → persist → new GHL note
- `GET|POST /api/sync`           reconciliation cron (drains pending idempotently)

## Redirects (next.config.mjs)
- /company            → /system
- /checkout/starter   → /enroll/essential
- /checkout/growth    → /enroll/growth-engine

## Idempotent GHL sync (Decision #4)
Postgres owns one immutable `stage_events` row per genuine transition. The
worker (`src/lib/ghl/sync.ts`) processes them sequentially per enrollment,
compare-and-set (reads the GHL contact first, writes only diffs), gated on
`last_processed_stage_event_id`. Contact messages create a NEW note each. The
`/api/sync` cron is the safety net behind the best-effort request-path sync.

## Chat 3 attach points (marked <Placeholder chat={3}>)
Secure checkout (on the accepted review page) · strategy-call calendar hand-off.

<!-- deploy-trigger-check: 2026-07-14 -->
