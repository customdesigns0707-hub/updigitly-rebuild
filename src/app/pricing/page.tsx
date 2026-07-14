import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { PricingTable } from '@/components/PricingTable';
import { MagneticButton } from '@/components/MagneticButton';
import { PRICING_DISCLOSURES } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Managed growth plans — Essential, Growth Engine, and Scale. Fixed pricing, a clear 6-month initial term, and one accountable team. Enrollment opens in the next build stage.',
};

/**
 * PRICING (/pricing) — presentation per LOCKED Decision #2. Fixed prices +
 * billing selector, four-pillar capability framing (never a flat service menu),
 * scope-protection, and page-level disclosures. Does NOT host the enrollment
 * transaction (Decision #3) — CTAs route only. Enrollment is built in Chat 2.
 */

const PILLARS = [
  { h: 'Foundation', p: 'Presence, brand, trust, and the conversion path.' },
  { h: 'Visibility', p: 'Search, local presence, maps, reviews, content.' },
  { h: 'Growth', p: 'Lead capture, CRM, automation, and follow-up.' },
  { h: 'Intelligence', p: 'Tracking, reporting, and continuous improvement.' },
];

const FAQ = [
  {
    q: 'Why is there a 6-month initial term?',
    a: 'Building and operating a connected system takes long enough to produce a real result. The 6-month initial service commitment applies to every plan and is shown clearly before you pay — "monthly" is simply the payment schedule, not a one-month term. After the initial term, plans run month-to-month.',
  },
  {
    q: 'What do the prepaid options change?',
    a: 'Only the cash-flow — nothing about the commitment. Paying 6 months or a year up front earns a discount (10% and 20%) for prepayment. The 6-month initial term is the same either way.',
  },
  {
    q: 'What if the plan turns out not to fit?',
    a: 'We are not selling a general money-back guarantee. What we do commit to: if we determine during onboarding that the selected plan cannot deliver the core engagement as presented, we will contact you and provide a fair resolution. The details live near checkout and in our terms.',
  },
  {
    q: 'What is not included in the price?',
    a: 'Advertising spend is billed separately, and some third-party software or production may be additional where an engagement requires it. Final scope is always defined in your service agreement. Complex or multi-brand needs are scoped as a tailored proposal — start with a strategy call.',
  },
];

export default function PricingPage() {
  return (
    <>
      <Nav active="/pricing" />

      <header className="head">
        <div className="kicker">{'//'} Pricing</div>
        <h1>Managed growth,<br /><span className="dim">priced without games.</span></h1>
        <p>
          Fixed pricing, a clear 6-month initial term, and one team accountable for the whole system. Pick the depth
          that fits where you are.
        </p>
      </header>

      <PricingTable />

      {/* four-pillar capability frame — never a flat service menu */}
      <section className="block block-wide">
        <Reveal><div className="sec-kicker">{'//'} What every plan operates</div></Reveal>
        <Reveal as="h2">Every plan runs the same system. <span className="dim">Depth is what changes.</span></Reveal>
        <div className="values">
          {PILLARS.map((p, i) => (
            <Reveal key={p.h} className="val">
              <div className="n">{String(i + 1).padStart(2, '0')}</div>
              <h3>{p.h}</h3>
              <p>{p.p}</p>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="prose" style={{ fontSize: '15px' }}>
            Capabilities are always operated inside these four pillars — not sold as an à-la-carte list.{' '}
            <Link href="/system" style={{ color: 'var(--green)' }}>See how the system operates →</Link>
          </p>
        </Reveal>
      </section>

      {/* page-level disclosures */}
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="direct" style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="lbl">Before you enroll</div>
          <ul style={{ listStyle: 'none', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
            {PRICING_DISCLOSURES.map((d) => (
              <li key={d} style={{ color: 'var(--slate)', fontSize: 14.5, lineHeight: 1.6, display: 'flex', gap: 11 }}>
                <span style={{ color: 'var(--green)', flexShrink: 0 }}>—</span>
                {d}
              </li>
            ))}
          </ul>
          <p className="note" style={{ marginTop: 20, lineHeight: 1.6 }}>
            The full commitment, billing, and renewal terms appear before payment and in our{' '}
            <Link href="/legal" style={{ color: 'var(--green)' }}>legal terms</Link>.
          </p>
        </div>
      </section>

      {/* commercial-trust FAQ */}
      <section className="block" style={{ paddingTop: 0 }}>
        <Reveal><div className="sec-kicker">{'//'} Straight answers</div></Reveal>
        <Reveal as="h2">The commercial terms, <span className="dim">up front.</span></Reveal>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary data-hover>{f.q}</summary>
              <div className="fa">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="final">
        <Reveal><div className="sec-kicker">{'//'} Not sure which fits?</div></Reveal>
        <Reveal as="h2">Tell us where you are.<br /><span className="dim">We&rsquo;ll tell you what works.</span></Reveal>
        <Reveal><MagneticButton href="/strategy-call">Book a strategy call <span className="arrow">→</span></MagneticButton></Reveal>
        <Reveal><span className="phone">Scale enrollments always start with a call.</span></Reveal>
      </section>

      <Footer />
    </>
  );
}
