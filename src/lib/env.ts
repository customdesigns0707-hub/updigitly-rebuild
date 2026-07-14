/**
 * Typed server env access for the enrollment/data layer (Phase 2 Chat 2).
 *
 * Every integration is OPTIONAL at boot so the app builds and the UI runs
 * without credentials — each subsystem exposes an `isConfigured` flag and
 * degrades safely when its keys are absent (Decision #4: "keep the enrollment
 * safely saved" even when a downstream is unavailable). Real keys are supplied
 * per environment via `.env.local` (local) or the Vercel dashboard (preview/prod).
 *
 * NOTE: this module is server-only. Never import it into a client component.
 * Only `NEXT_PUBLIC_*` values may cross to the browser (see turnstile widget).
 */
import 'server-only';

function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

/** Postgres (Supabase) — the canonical enrollment/disclosure/audit store. */
export const db = {
  /** Full Postgres connection string. In Supabase: Settings → Database →
   *  Connection string (use the pooled "Transaction"/"Session" URI for serverless). */
  url: opt('DATABASE_URL'),
  get isConfigured() {
    return !!this.url;
  },
};

/** Cloudflare Turnstile — bot protection on the public forms. */
export const turnstile = {
  siteKey: opt('NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
  secretKey: opt('TURNSTILE_SECRET_KEY'),
  /** Server-side verification only runs when the secret is present. */
  get isConfigured() {
    return !!this.secretKey;
  },
};

/** GoHighLevel (LeadConnector) — CRM / workflow / comms layer ONLY. Never the
 *  source of truth for business state (Decision #4). */
export const ghl = {
  token: opt('GHL_API_TOKEN'),
  locationId: opt('GHL_LOCATION_ID'),
  apiBase: opt('GHL_API_BASE') ?? 'https://services.leadconnectorhq.com',
  /** API version header LeadConnector requires (date-stamped). */
  apiVersion: opt('GHL_API_VERSION') ?? '2021-07-28',
  /**
   * Optional custom-field ID map. Field IDs are location-specific, so sync
   * only writes the fields whose IDs are supplied; unmapped answers still reach
   * GHL inside the qualifier Note, so nothing is lost when a mapping is absent.
   * Env keys: GHL_FIELD_PLAN, GHL_FIELD_BILLING, GHL_FIELD_LOCATIONS,
   * GHL_FIELD_WEBSITE, GHL_FIELD_CRM, GHL_FIELD_NEEDS, GHL_FIELD_COMPLEXITY.
   */
  fields: {
    plan: opt('GHL_FIELD_PLAN'),
    billing: opt('GHL_FIELD_BILLING'),
    locations: opt('GHL_FIELD_LOCATIONS'),
    website: opt('GHL_FIELD_WEBSITE'),
    crm: opt('GHL_FIELD_CRM'),
    needs: opt('GHL_FIELD_NEEDS'),
    complexity: opt('GHL_FIELD_COMPLEXITY'),
  },
  /** Optional pipeline/stage IDs — reserved for Chat 3 (opportunity creation).
   *  Read here so the env contract is documented in one place. */
  pipelineId: opt('GHL_PIPELINE_ID'),
  stageId: opt('GHL_STAGE_ID'),
  get isConfigured() {
    return !!this.token && !!this.locationId;
  },
};

/** Shared secret guarding the /api/sync worker endpoint (cron bearer token). */
export const sync = {
  secret: opt('SYNC_SECRET'),
};

/** Public canonical URL (already used by site config). */
export const siteUrl = opt('NEXT_PUBLIC_SITE_URL') ?? 'https://updigitly.com';

/** True in local dev (used only to relax bot-check when Turnstile is unset). */
export const isDev = process.env.NODE_ENV !== 'production';
