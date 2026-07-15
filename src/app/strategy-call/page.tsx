import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { CalendarHandoff } from '@/components/CalendarHandoff';
import { StrategyQualifierForm } from '@/components/strategy-call/StrategyQualifierForm';
import { siteConfig } from '@/config/site';
import { turnstile } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Strategy Call',
  description:
    'A working conversation about your growth — and the enrollment path for Scale. An organized commercial process, not a free-consulting session.',
};

/**
 * STRATEGY CALL (/strategy-call) — Scale's ONLY enrollment path + the escape
 * hatch for unclear situations (Sitemap v2, Decision #3). Agenda +
 * expectation-setting are real. Calendar hand-off wired live in Chat 4
 * (CalendarHandoff, Decision #4: branded link/card). The pre-booking
 * qualifier (native form, POSTs to /api/strategy-call, persisted to Postgres,
 * best-effort synced to GHL) is wired live here — sits alongside the calendar,
 * never gates it (Decision #3: this page is also the escape hatch for unclear
 * situations, so nothing here can block or delay booking). No free-consulting
 * implication and no acceptance guarantee in the copy.
 */

const AGENDA = [
  { t: 'FIRST', h: 'Your situation', p: 'Where your business is, what your market looks like, and what is and isn’t working across your current presence. A real picture, not a pitch.' },
  { t: 'THEN', h: 'The constraint', p: 'What we see across the four pillars — where growth is actually being held back, and what a connected system would change.' },
  { t: 'FINALLY', h: 'The path', p: 'A straight recommendation: whether an Essential/Growth plan fits, or whether your complexity points to a Scale engagement — and what the first steps look like.' },
];

export default function StrategyCallPage() {
  return (
    <>
      <Nav active="/strategy-call" />

      <div className="contact-wrap">
        <div className="kicker">{'//'} Strategy Call</div>
        <h1>A working conversation <span className="dim">about your growth.</span></h1>
        <p className="sub">
          This is an organized commercial process, not free consulting. We&rsquo;ll get to the real constraint on your
          growth and give you a straight recommendation — and it&rsquo;s the enrollment path for Scale engagements.
        </p>

        <div className="cols">
          <div>
            <div className="agenda">
              {AGENDA.map((a) => (
                <Reveal key={a.t} className="ag-item">
                  <div className="adot" />
                  <div className="t">{a.t}</div>
                  <h3>{a.h}</h3>
                  <p>{a.p}</p>
                </Reveal>
              ))}
            </div>
            <Reveal className="direct">
              <div className="lbl">Prefer to just talk?</div>
              <a className="sf-tel" href={siteConfig.phone.href} data-hover style={{ marginTop: 14 }}>
                <span className="pulse" />Call · {siteConfig.phone.display}
              </a>
              <p style={{ marginTop: 14 }}>Reach a strategist during business hours — not a phone tree.</p>
            </Reveal>
          </div>

          {/* Calendar hand-off — GHL booking retained V1, wired live in Chat 4 */}
          <div>
            <CalendarHandoff />
          </div>
        </div>

        <div className="kicker" style={{ marginTop: 72 }}>{'//'} Before we meet</div>

        <div className="cols" style={{ marginTop: 32 }}>
          <div>
            <Reveal className="direct">
              <div className="lbl">A few quick questions first</div>
              <p style={{ marginTop: 10 }}>
                A short pre-booking qualifier helps us come prepared and make the call worth your time. It never
                auto-approves, rejects, prices, or rewrites anything — it just gets us the picture in advance.
              </p>
            </Reveal>
          </div>

          {/* Pre-booking qualifier — native form, wired live */}
          <div>
            <StrategyQualifierForm turnstileSiteKey={turnstile.siteKey} />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
