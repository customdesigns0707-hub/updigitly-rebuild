/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Redirect map — LOCKED per Decision #3/#4 (2026-07-11). Real routes only,
   * single-hop 301s, no chains. Executed here so crawled/old links never 404
   * after the Phase 3 flip.
   *   /company            → /system            (page renamed)
   *   /checkout/starter   → /enroll/essential  (new enrollment routes)
   *   /checkout/growth    → /enroll/growth-engine
   * NOTE: there is NO /checkout/scale and never will be — Scale books only.
   */
  async redirects() {
    return [
      { source: '/company', destination: '/system', permanent: true },
      { source: '/checkout/starter', destination: '/enroll/essential', permanent: true },
      { source: '/checkout/growth', destination: '/enroll/growth-engine', permanent: true },
    ];
  },

  async headers() {
    // CSP allow-list, one line per integration so it's obvious what each
    // origin is for and safe to extend later without re-deriving the list:
    //   - 'self'                              — same-origin (app code, /api/*, generated icon)
    //   - challenges.cloudflare.com            — Turnstile widget script + its own XHR/iframe challenge
    //   - js.stripe.com / checkout.stripe.com  — Stripe (checkout is a top-level redirect today,
    //                                            not embedded; allow-listed so Stripe.js/Elements can
    //                                            be added later without another CSP change)
    //   - va.vercel-scripts.com / vitals.vercel-insights.com — @vercel/analytics (same-origin
    //                                            /_vercel/insights/* proxy in prod; these are the
    //                                            direct hosts used in debug/edge-case paths)
    //   - fonts.googleapis.com / fonts.gstatic.com — Google Fonts stylesheet + font files (src/app/layout.tsx)
    // style-src needs 'unsafe-inline': the UI uses React inline `style={{...}}`
    // props throughout (dynamic values — not extractable to static CSS/nonces
    // without a much larger refactor).
    //
    // script-src ALSO needs 'unsafe-inline': Next.js App Router injects its own
    // inline <script> tags on every page (RSC flight-data hydration payloads),
    // including statically-generated ones. Verified empirically against a real
    // production build (`next build && next start` + Playwright): without
    // 'unsafe-inline' those get blocked and React never hydrates — clicking
    // anything (contact-form options, Turnstile, every form) does nothing, while
    // the static HTML shell still looks fine. The textbook fix is a per-request
    // nonce via middleware, but Next.js explicitly documents nonces as
    // incompatible with static rendering — this app relies on it (/, /pricing,
    // /contact, /legal, /system are all statically generated), so adopting
    // nonces would force those to dynamic rendering, a materially bigger change
    // than "add a CSP." 'unsafe-inline' here still blocks the CSP's main
    // real-world win — loading a script from an unauthorized third-party origin
    // (e.g. an injected <script src="evil.example/x.js">) — since script-src is
    // still host-restricted to 'self' + the allow-listed integrations below.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self' https://challenges.cloudflare.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://checkout.stripe.com",
      "frame-src https://challenges.cloudflare.com",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
