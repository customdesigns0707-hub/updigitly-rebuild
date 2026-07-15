/**
 * Central site configuration — nav, footer map, contact details, canonical URL.
 * Structure follows the LOCKED Sitemap v2 (Decision #3, 2026-07-11):
 *   Desktop nav  = logo→Home · The System · Pricing · "Strategy Call" CTA
 *   Mobile menu  = System / Pricing / Strategy Call / Contact + phone CTA
 *   Footer       = nav + Engagements (→ /pricing anchors) + managed inbox
 *                  + phone CTA + "© Updigitly · Legal"
 * Edit here once; every component reads from this.
 */
export const siteConfig = {
  name: 'Updigitly',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://updigitly.com',
  description:
    'Updigitly is a managed digital growth partner. We take ownership of a connected system — foundation, visibility, growth, and intelligence — and are accountable for the growth it produces.',

  // LOCKED: genuinely monitored business callback number, published discreetly
  // inside an on-brand tel: CTA button (never a raw displayed number).
  phone: {
    display: '(520) 542-1876',
    href: 'tel:5205421876',
  },

  // Managed inbox (footer). PLACEHOLDER address — confirm the real monitored
  // inbox during the phone/inbox ops-standard deliverable (Decision #3 item a).
  email: {
    display: 'hello@updigitly.com',
    href: 'mailto:hello@updigitly.com',
  },

  // Strategy Call booking hand-off (Chat 4, Decision #4: branded link/card —
  // GHL calendar retained V1). Opens top-level (new tab), never embedded, per
  // the mobile/ad-blocker reliability call. Falls back to the phone CTA when
  // unset. Set NEXT_PUBLIC_GHL_CALENDAR_URL in .env.local / Vercel.
  calendar: {
    url: process.env.NEXT_PUBLIC_GHL_CALENDAR_URL || null,
  },

  // Primary desktop nav (logo is the Home link, rendered separately).
  nav: [
    { label: 'The System', href: '/system' },
    { label: 'Pricing', href: '/pricing' },
  ],

  // Full mobile menu order (System / Pricing / Strategy Call / Contact).
  mobileNav: [
    { label: 'The System', href: '/system' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Strategy Call', href: '/strategy-call' },
    { label: 'Contact', href: '/contact' },
  ],

  // Locked primary header CTA — label is fixed ("Strategy Call").
  primaryCta: { label: 'Strategy Call', href: '/strategy-call' },

  footer: {
    // Plan links point at /pricing ANCHORS only — never straight into
    // enrollment (deliberate qualification friction, per Decision #3).
    engagements: [
      { label: 'Essential', href: '/pricing#essential' },
      { label: 'Growth Engine', href: '/pricing#growth-engine' },
      { label: 'Scale', href: '/pricing#scale' },
    ],
    nav: [
      { label: 'The System', href: '/system' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Strategy Call', href: '/strategy-call' },
      { label: 'Contact', href: '/contact' },
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;
