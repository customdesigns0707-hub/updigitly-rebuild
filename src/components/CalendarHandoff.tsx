import { siteConfig } from '@/config/site';

/**
 * Strategy Call booking hand-off (Chat 4). Decision #4: GHL calendar retained
 * V1, delivered as a branded link/card — most reliable across mobile and
 * ad-blockers, versus an embedded iframe. Opens the booking page top-level in
 * a new tab. Degrades to a phone CTA if NEXT_PUBLIC_GHL_CALENDAR_URL isn't set
 * yet, so the page never ships a dead button.
 */
const badgeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono),JetBrains Mono,monospace',
  fontSize: 11,
  letterSpacing: '.14em',
  color: 'var(--amber)',
  border: '1px solid rgba(255,184,77,.35)',
  padding: '7px 14px',
  borderRadius: 100,
};

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 16,
  padding: 40,
  minHeight: 320,
};

export function CalendarHandoff() {
  const url = siteConfig.calendar.url;

  if (!url) {
    return (
      <div className="embed-shell" style={panelStyle}>
        <span style={badgeStyle}>BOOKING</span>
        <h3 style={{ fontFamily: 'var(--font-display),Space Grotesk,sans-serif', fontSize: 22, letterSpacing: '-.01em' }}>
          Booking isn&rsquo;t live online yet
        </h3>
        <p style={{ color: 'var(--slate)', fontSize: 14.5, lineHeight: 1.65, maxWidth: 380 }}>
          Call us and we&rsquo;ll get you on the calendar directly — no automated booking form required.
        </p>
        <a className="sf-tel" href={siteConfig.phone.href} data-hover>
          <span className="pulse" />Call · {siteConfig.phone.display}
        </a>
      </div>
    );
  }

  return (
    <div className="embed-shell" style={panelStyle}>
      <span style={badgeStyle}>BOOKING</span>
      <h3 style={{ fontFamily: 'var(--font-display),Space Grotesk,sans-serif', fontSize: 22, letterSpacing: '-.01em' }}>
        Book your strategy call
      </h3>
      <p style={{ color: 'var(--slate)', fontSize: 14.5, lineHeight: 1.65, maxWidth: 380 }}>
        Opens our secure scheduling page in a new tab — pick a time that works and you&rsquo;re booked.
      </p>
      <a className="btn-primary" href={url} target="_blank" rel="noopener noreferrer" data-hover>
        Open booking calendar →
      </a>
      <p className="q-fine">No account required. You&rsquo;ll get a confirmation and calendar invite by email.</p>
    </div>
  );
}
