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
    return [
      {
        // Baseline security headers. A tuned CSP is added later (Chat 3/4) once
        // the final list of Turnstile/Stripe/GHL domains is known.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
