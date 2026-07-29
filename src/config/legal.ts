/**
 * Legal identity — the SINGLE place the interim-launch legal facts live, so the
 * /legal page, the combined Service Order + Agreement, and the acceptance
 * evidence all read from one source and can never drift.
 *
 * Interim legal/launch architecture LOCKED 2026-07-28 (see project memory
 * `project_updigitly_interim_legal.md`). This file implements it; it does not
 * reopen it.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ONE GATE (interim timing gate). Do NOT print the Arizona LLC's name in any
 * published/signable document until its Arizona filing is legally EFFECTIVE.
 * When you kick this off:
 *   • If the AZ filing is effective: set ENTITY_FILING_EFFECTIVE = true, put the
 *     EXACT Arizona-registered name in AZ_LLC_LEGAL_NAME, and set
 *     LEGAL_EFFECTIVE_DATE to the publish date.
 *   • If it is NOT yet effective: leave all three as-is. The name renders as a
 *     single, clearly-marked placeholder and the effective date stays blank —
 *     nothing invents an entity name or labels it an LLC before it exists.
 * The New Mexico parent LLC is an ownership fact only and NEVER appears on any
 * client-facing document — it is intentionally absent from this file.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** Flip to true ONLY once the Arizona operating LLC's filing is legally effective. */
export const ENTITY_FILING_EFFECTIVE = false;

/** EXACT Arizona-registered legal name of the operating LLC. Leave '' until filed. */
export const AZ_LLC_LEGAL_NAME = '';

/** Publication/effective date, e.g. 'July 29, 2026'. Leave '' until publish. */
export const LEGAL_EFFECTIVE_DATE = '';

/** The single, clearly-marked placeholder used everywhere until the name is real. */
export const ENTITY_NAME_PLACEHOLDER = '[ARIZONA LLC LEGAL NAME — pending Arizona filing]';

/** True when the entity name is still the placeholder (drives the one on-page marker). */
export const ENTITY_NAME_IS_PLACEHOLDER = !(ENTITY_FILING_EFFECTIVE && AZ_LLC_LEGAL_NAME.trim() !== '');

/** The contracting/operating entity's name as it should appear in text. */
export const ENTITY_NAME = ENTITY_NAME_IS_PLACEHOLDER ? ENTITY_NAME_PLACEHOLDER : AZ_LLC_LEGAL_NAME.trim();

/** Short brand name used conversationally in the documents. */
export const ENTITY_SHORT = 'Updigitly';

/**
 * Parties/identity phrase. Once effective it states the fact ("an Arizona limited
 * liability company"); while pending it does NOT assert the entity exists yet —
 * it is careful not to label a not-yet-formed entity an LLC.
 */
export const ENTITY_DESCRIPTOR = ENTITY_NAME_IS_PLACEHOLDER
  ? `${ENTITY_NAME} (Arizona limited liability company — formation pending)`
  : `${ENTITY_NAME}, an Arizona limited liability company`;

/** Effective-date display: the real date once set, else an explicit "to be set" note. */
export const EFFECTIVE_DATE_DISPLAY = LEGAL_EFFECTIVE_DATE.trim() !== ''
  ? LEGAL_EFFECTIVE_DATE.trim()
  : 'To be set on publication';

/** Published business address (OK to publish/store). Oro Valley, Pima County, AZ. */
export const BUSINESS_ADDRESS = {
  line1: '1846 E Innovation Park Dr',
  city: 'Oro Valley',
  state: 'AZ',
  zip: '85755',
  get oneLine() {
    return `${this.line1}, ${this.city}, ${this.state} ${this.zip}`;
  },
};

/** Governing law / venue — Arizona, Pima County (the operating entity IS an AZ LLC). */
export const GOVERNING_LAW_STATE = 'Arizona';
export const VENUE = 'the state and federal courts located in Pima County, Arizona';

/**
 * Legal-page contact routing (aliases the operator is creating — must route
 * before /legal publishes). Decided 2026-07-28.
 */
export const LEGAL_EMAILS = {
  privacy: 'privacy@updigitly.com', // privacy / data-subject requests
  legal: 'legal@updigitly.com',     // legal notices
  billing: 'billing@updigitly.com', // billing questions
};

/**
 * Named third-party processors, by function, disclosed truthfully in the privacy
 * policy (interim architecture: name the real categories, claim nothing unused).
 */
export const PROCESSORS: { name: string; role: string }[] = [
  { name: 'Stripe', role: 'payment processing and subscription billing' },
  { name: 'HighLevel / LeadConnector', role: 'CRM, workflow, and client communications' },
  { name: 'Supabase', role: 'database hosting for our enrollment and account records' },
  { name: 'Vercel', role: 'website hosting and delivery' },
  { name: 'Cloudflare', role: 'bot protection (Turnstile) on our web forms' },
  { name: 'Google Fonts', role: 'web-font delivery' },
];

/** Version stamp of the combined Service Order + Agreement (bump on any change). */
export const AGREEMENT_VERSION = 'v1-2026-07';
