/**
 * Home's numbered capability strip. 2026-07-14: replaced the rotating
 * "slot-machine" tick version — three rounds of tuning (crossfade, then a
 * staggered/never-blank ripple) still read as a glitch to the operator, a
 * real red flag for a homepage first impression. Switched to a CONTINUOUS
 * marquee instead: the exact same proven technique as the capability
 * marquee below it (duplicate the list, animate translateX, infinite linear
 * loop) — there's no discrete swap moment, so there's nothing to flash or
 * stutter. It just flows.
 *
 * Per operator: scrolls the OPPOSITE direction from the marquee below
 * (rightward here vs. leftward there), noticeably SLOWER (see capsScroll's
 * duration in globals.css — tuned slower than .marquee's px/sec rate so the
 * two don't compete/feel busy), and keeps the same thin vertical divider
 * between items that the old grid version used, so it still reads as "the
 * metric strip" rather than a second copy of the marquee.
 *
 * No rotation state, no timers, no CountUp-reset-on-tick — this is a plain
 * server-renderable component. Numbers are static text (a continuously
 * flowing strip has no single "settle" moment for a count-up to land on).
 * All 32 items (original 7 + the operator's 25 additions, 2026-07-14) are
 * included; there's no fixed "how many fit" question since the strip just
 * flows past at whatever width is available.
 */

const CAPS = [
  'Conversion-focused UI/UX and digital foundations.',
  'Search performance built into the system.',
  'Visibility, listings, reviews, and local discovery.',
  'Google and multi-channel advertising management.',
  'Testing and improving the path from visit to lead.',
  'Leads organized and managed in one connected system.',
  'Email and SMS workflows that keep opportunities moving.',
  'Bespoke web applications built around your workflows.',
  'Native and cross-platform apps for iOS and Android.',
  'Decoupled commerce built for speed and flexibility.',
  'Custom middleware connecting your systems and APIs.',
  'AI chatbots built and trained on your business.',
  'AI-driven automation for internal operations.',
  'Predictive models that score and prioritize leads.',
  'Centralized cloud data warehousing, built to scale.',
  'Server-side tracking for accurate, durable data.',
  'Custom dashboards turning data into decisions.',
  'Strategy for owning and activating first-party data.',
  'Automated, data-driven display ad buying.',
  'Advertising across streaming TV and OTT platforms.',
  'Digital advertising on out-of-home screens.',
  'Advertising placed across streaming audio platforms.',
  'Coordinated messaging across every channel.',
  'In-depth research into your market and competitors.',
  'Focus groups and studies that surface real insight.',
  'Full rebranding and repositioning, top to bottom.',
  'Go-to-market strategy for new products and launches.',
  'Marketing systems built for franchise and multi-location brands.',
  'Crisis communication and public relations management.',
  'Brand consolidation through mergers and acquisitions.',
  'Media buying across TV, radio, and print.',
  'Event marketing and experiential brand activations.',
];

export function CapsStrip() {
  const loop = [...CAPS, ...CAPS]; // doubled for the seamless-loop marquee trick

  return (
    <div className="caps">
      {/* Real content, once, for screen readers / SEO — the doubled visual
          track below is decorative (aria-hidden), same pattern as .marquee. */}
      <p className="sr-only">{CAPS.join(' ')}</p>
      <div className="caps-marquee-wrap">
        <div className="caps-marquee" aria-hidden="true">
          {loop.map((d, i) => (
            <div className="cap-item" key={i}>
              <span className="cnum">{String((i % CAPS.length) + 1).padStart(3, '0')}</span>
              <span className="cdesc">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
