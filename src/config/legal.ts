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
 * CONTRACTING PARTY — LOCKED 2026-07-30. Do not reopen. The contracting party
 * is Joby Gran, an individual doing business as Updigitly (a sole proprietor /
 * individual DBA — not an LLC or other entity). There is no AZ-entity timing
 * gate: this is the real, final party name, usable in published/signable
 * documents now.
 * The New Mexico parent LLC is an ownership fact only and NEVER appears on any
 * client-facing document — it is intentionally absent from this file.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** Publication/effective date, e.g. 'July 29, 2026'. Leave '' until publish. */
export const LEGAL_EFFECTIVE_DATE = '';

/** Short brand name used conversationally in the documents. */
export const ENTITY_SHORT = 'Updigitly';

/** The contracting/operating party's name as it should appear in text. */
export const ENTITY_NAME = `Joby Gran, doing business as ${ENTITY_SHORT}`;

/** Parties/identity phrase — an individual DBA, not an entity. */
export const ENTITY_DESCRIPTOR = `Joby Gran, an individual doing business as ${ENTITY_SHORT}`;

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

/** Governing law / venue — Arizona, Pima County (where the individual operator does business). */
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
