import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { MagneticButton } from '@/components/MagneticButton';

export const metadata: Metadata = {
  title: 'The System',
  description:
    'The system is how we coordinate the work — not software we sell. Four pillars operated as one accountable managed model: diagnostic depth, prioritization, and operating discipline.',
};

/**
 * THE SYSTEM (/system) — persuasion-depth page (Sitemap v2, Decision #3).
 * Replaces /company; absorbs Services/About/Why-Us. COPY REQUIREMENT (locked):
 * immediately anchor "system" to a managed operating METHODOLOGY, never
 * software/platform/SaaS. Must be substantive — diagnostic depth, prioritization
 * logic, operating discipline — not four pillar cards with icons.
 */

const PILLARS = [
  {
    cls: 'model primary',
    tag: 'Pillar 01',
    h: 'Foundation',
    p: 'The presence a business is judged by. We own the website, brand, trust signals, and the conversion path — so the first impression works and the route from visit to enquiry is deliberate, not accidental.',
    li: ['Credibility and conversion presence', 'Brand and trust signals', 'The visit-to-enquiry path'],
  },
  {
    cls: 'model alt',
    tag: 'Pillar 02',
    h: 'Visibility',
    p: 'Being found by people already looking. We work search, local presence, maps, reviews, and content as a connected effort — because ranking without a foundation, or presence without reputation, leaks the very demand it creates.',
    li: ['Search and local presence', 'Maps, reviews, reputation', 'Content that earns attention'],
  },
  {
    cls: 'model alt',
    tag: 'Pillar 03',
    h: 'Growth',
    p: 'Turning attention into revenue. Lead capture, CRM, automation, and follow-up run as one flow so nothing that arrives is dropped — every enquiry is answered, tracked, and worked until it converts or is understood.',
    li: ['Lead capture and instant response', 'CRM and pipeline', 'Automation and follow-up'],
  },
  {
    cls: 'model primary',
    tag: 'Pillar 04',
    h: 'Intelligence',
    p: 'Knowing what works — and doing more of it. Tracking, reporting, and measurement close the loop, turning the other three pillars from activity into a system that compounds because every decision is informed by what actually paid.',
    li: ['Tracking and measurement', 'Clear, regular reporting', 'Continuous prioritized improvement'],
  },
];

const OPERATING = [
  { h: 'Diagnostic depth', p: 'We start by finding the real constraint across all four pillars — not the loudest symptom. The plan is built around what is actually holding growth back.' },
  { h: 'Prioritization logic', p: 'We manage the work most likely to improve performance next, sequenced by expected impact — not fixed task quotas or a checklist run on autopilot.' },
  { h: 'Operating discipline', p: 'Monitoring, regular reporting, documented priority updates, and a recurring strategic review. Prioritized work must never feel like invisible work.' },
];

export default function SystemPage() {
  return (
    <>
      <Nav active="/system" />

      <header className="head left">
        <div className="inner" style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="kicker">{'//'} The System</div>
          <h1 style={{ maxWidth: 940 }}>The system is how we coordinate the work <span className="dim">— not software we sell.</span></h1>
          <p style={{ color: 'var(--slate)', fontSize: 18, lineHeight: 1.7, maxWidth: 640, marginTop: 30 }}>
            Most digital work fails at the seams — between the website and the search presence, between the lead and
            the follow-up, between what was done and what it produced. Our system is a managed operating model built
            to remove those seams and hold one team accountable for the whole.
          </p>
        </div>
      </header>

      {/* what the system actually is */}
      <section className="block block-wide">
        <Reveal><div className="sec-kicker">{'//'} What &ldquo;the system&rdquo; means</div></Reveal>
        <Reveal as="h2">One connected operating model, <span className="dim">run by one accountable team.</span></Reveal>
        <Reveal>
          <p className="prose">
            When each part of your digital presence is owned by a different vendor, no one is responsible for the
            number that matters. The system is our answer: a single managed operating model spanning four pillars,
            coordinated so each reinforces the others, and operated end to end so there is exactly one team to hold
            accountable. It is <b>a discipline for running the work</b> — not a platform, not a SaaS product, not a
            login we hand you and walk away from.
          </p>
        </Reveal>
      </section>

      {/* four pillars as an interconnected model */}
      <section className="block block-wide" style={{ paddingTop: 0 }}>
        <Reveal><div className="sec-kicker">{'//'} The four pillars</div></Reveal>
        <Reveal as="h2">Four pillars that only work <span className="dim">when they work together.</span></Reveal>
        <div className="models" style={{ marginTop: 48 }}>
          {PILLARS.map((p) => (
            <Reveal key={p.h} className={p.cls}>
              <span className="tag">{p.tag}</span>
              <h3>{p.h}</h3>
              <p>{p.p}</p>
              <ul>
                {p.li.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      {/* how engagements operate */}
      <section className="block block-wide" style={{ paddingTop: 0 }}>
        <Reveal><div className="sec-kicker">{'//'} How engagements operate</div></Reveal>
        <Reveal as="h2">The discipline behind the work.</Reveal>
        <div className="values" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          {OPERATING.map((o, i) => (
            <Reveal key={o.h} className="val">
              <div className="n">{String(i + 1).padStart(2, '0')}</div>
              <h3>{o.h}</h3>
              <p>{o.p}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* how depth changes across tiers */}
      <section className="block block-wide" style={{ paddingTop: 0 }}>
        <Reveal><div className="sec-kicker">{'//'} Depth by engagement</div></Reveal>
        <Reveal as="h2">Same system. <span className="dim">Different depth.</span></Reveal>
        <Reveal>
          <p className="prose">
            The system doesn&rsquo;t change from plan to plan — the depth we operate it at does. <b>Essential</b>
            &nbsp;installs and runs the essential spine for businesses starting from little. <b>Growth Engine</b> runs
            a managed core across all four pillars at depth, prioritized by impact. <b>Scale</b> is a materially
            different relationship for organizations whose complexity can no longer be held inside one program.
          </p>
        </Reveal>
        <Reveal>
          <p className="prose" style={{ fontSize: '15px', marginTop: 20 }}>
            <Link href="/pricing" style={{ color: 'var(--green)' }}>See how depth maps to plans →</Link>
          </p>
        </Reveal>
      </section>

      <section className="final">
        <Reveal><div className="sec-kicker">{'//'} See where you fit</div></Reveal>
        <Reveal as="h2">Let&rsquo;s find the constraint<br />that&rsquo;s holding growth back.</Reveal>
        <Reveal><MagneticButton href="/strategy-call">Book a strategy call <span className="arrow">→</span></MagneticButton></Reveal>
        <Reveal><span className="phone">Or <Link href="/pricing" style={{ color: 'var(--amber)' }}>view the plans →</Link></span></Reveal>
      </section>

      <Footer />
    </>
  );
}
