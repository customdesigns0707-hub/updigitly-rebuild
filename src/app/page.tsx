import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { HeroLayers } from '@/components/hero/HeroLayers';
import { BeamSlider } from '@/components/BeamSlider';
import { MagneticButton } from '@/components/MagneticButton';
import { CapsStrip } from '@/components/CapsStrip';

/**
 * HOME (/) — high-intent ROUTING ENGINE (Sitemap v2, Decision #3). Compact
 * teaser beats: problem → positioning → four-pillar teaser → audience routing
 * → operating-process preview → illustrative transformation → plan preview →
 * labeled-sample proof → FAQ → factual legitimacy → final pricing/strategy
 * paths. Primary CTA = "View Plans". Four pillars are ORGANIZATIONAL, never a
 * flat services menu (Decision #1). No fabricated results anywhere.
 */

const PILLARS = [
  { n: '01', h: 'Foundation', p: 'The credible, conversion-built presence a business is judged by — website, brand, trust, and the path from visit to enquiry.' },
  { n: '02', h: 'Visibility', p: 'Being found by the people already looking — search, local presence, maps, reviews, and the content that earns attention.' },
  { n: '03', h: 'Growth', p: 'Turning attention into revenue — lead capture, CRM, automation, and follow-up that never lets an opportunity go cold.' },
  { n: '04', h: 'Intelligence', p: 'Knowing what works and doing more of it — tracking, reporting, and the continuous improvement that keeps the system sharpening.' },
];

const ROUTES = [
  { tag: 'Weak · invisible · fragmented', h: 'Start with Essential', p: 'We install and operate the essential digital spine, then keep it running — so you finally have a presence that works.', href: '/pricing#essential', cta: 'See Essential' },
  { tag: 'Established · ready to grow', h: 'Run the Growth Engine', p: 'A managed core across all four pillars, prioritized by expected impact — the compounding option for businesses with momentum.', href: '/pricing#growth-engine', cta: 'See Growth Engine' },
  { tag: 'Complex · multi-brand · strategic', h: 'Talk about Scale', p: 'A materially different relationship. When one program can no longer hold it, we scope the engagement on a strategy call.', href: '/strategy-call', cta: 'Book a call' },
];

// Marquee — the full capability loop, flowing foundation → visibility →
// acquisition → conversion → automation → intelligence (all run as one system).
const CAPABILITIES = ['Brand Strategy', 'Custom Web Design', 'E-commerce Development', 'Local SEO', 'Technical SEO', 'Paid Advertising', 'Conversion Optimization', 'CRM Integration', 'Marketing Automation', 'AI Automation', 'Analytics & Reporting'];

const FAQ = [
  { q: 'What exactly do you do?', a: 'We take ownership of a connected growth system — foundation, visibility, growth, and intelligence — and operate it for you. We are accountable for the growth it produces, not for handing you a stack of disconnected services.' },
  { q: 'Is this just software or CRM setup?', a: 'No. The connected system is the mechanism; the value is strategy, ownership, continuous improvement, and accountability. We are a managed growth partner, not a software integrator.' },
  { q: 'How do I get started?', a: 'Most businesses enroll directly in a plan on the pricing page. If your situation is complex or you are not sure which plan fits, book a strategy call and we will point you the right way.' },
  { q: 'Do you lock me in?', a: 'Every plan carries a 6-month initial service commitment, shown clearly before you ever pay. After that it is month-to-month. We aim to be indispensable through performance, never through hostage conditions.' },
];

export default function HomePage() {
  return (
    <>
      <Nav />

      <header className="hero">
        {/* Decoration switch: Hidden Deck (desktop/tablet) vs classic ParticleField (phones) */}
        <HeroLayers />
        <div className="hero-inner">
          <div className="kicker">Managed digital growth</div>
          <h1>
            <span className="line"><span><span className="dim">One connected system.</span></span></span>
            <span className="line"><span>One team <span className="accent">accountable</span> for growth.</span></span>
          </h1>
          <p className="hero-sub">
            Most businesses don&rsquo;t have a marketing problem — they have a system problem: no strategy, no
            ownership, no one accountable for the number that matters. Updigitly owns all of it.
          </p>
          <div className="hero-ctas">
            <MagneticButton href="/pricing">View plans <span className="arrow">→</span></MagneticButton>
            <Link className="btn-ghost" href="/strategy-call" data-hover><span className="pulse" />Book a strategy call</Link>
          </div>
        </div>
        <div className="scroll-hint">Scroll</div>
      </header>

      {/* ---- capability strip (001–007), live METRIC-STRIP treatment: bordered
           band + hairline dividers, no panels, no glow. Sits between the hero
           ticker and the capability marquee (live-site rhythm). Desktop stays
           the original static 7-in-a-row; tablet/phone auto-rotate a smaller
           window of consecutive items so nothing wraps into a dead half-row
           and no text gets cut off (see CapsStrip.tsx). ---- */}
      <CapsStrip />

      {/* ---- capability loop: running banner ---- */}
      <div className="marquee-wrap">
        <div className="marquee-label">One connected system</div>
        <div className="marquee" aria-hidden="true">
          {[...CAPABILITIES, ...CAPABILITIES].map((x, i) => <span key={i}>{x}</span>)}
        </div>
      </div>

      {/* ---- problem recognition ---- */}
      <section className="block block-wide" id="why">
        <Reveal><div className="sec-kicker">{'//'} Why growth stalls</div></Reveal>
        <Reveal as="h2">A website here. SEO there. Ads somewhere else. <span className="dim">Nobody accountable.</span></Reveal>
        <Reveal>
          <p className="prose">
            When your digital presence is missing a foundation, running on weak tactics, or stitched together from
            disconnected tools, growth suffers — not for lack of effort, but for lack of a <b>clear strategy, real
            ownership, and one connected system</b> tying the work together. That gap is exactly what we exist to close.
          </p>
        </Reveal>
      </section>

      {/* ---- positioning + four-pillar teaser (organizational, not a service menu) ---- */}
      <section className="block block-wide" id="system" style={{ paddingTop: 0 }}>
        <Reveal><div className="sec-kicker">{'//'} A different approach</div></Reveal>
        <Reveal as="h2">Four pillars, <span className="dim">operated as one system.</span></Reveal>
        <Reveal>
          <p className="prose" style={{ marginBottom: 8 }}>
            We don&rsquo;t sell you services to manage. We take ownership of a single connected system across four
            pillars — and operate it as one accountable whole.
          </p>
        </Reveal>
        <div className="values">
          {PILLARS.map((p) => (
            <Reveal key={p.n} className="val">
              <div className="n">{p.n}</div>
              <h3>{p.h}</h3>
              <p>{p.p}</p>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="prose" style={{ fontSize: '15px' }}>
            The pillars are how we organize the work — not a menu to pick from. <Link href="/system" style={{ color: 'var(--green)' }}>See how the system operates →</Link>
          </p>
        </Reveal>
      </section>

      {/* ---- audience / current-state routing (doubles as plan preview) ---- */}
      <section className="block block-wide" style={{ paddingTop: 0 }}>
        <Reveal><div className="sec-kicker">{'//'} Where you are now</div></Reveal>
        <Reveal as="h2">We meet you at your stage <span className="dim">— and route from there.</span></Reveal>
        <div className="values" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          {ROUTES.map((r) => (
            <Reveal key={r.h} className="val">
              <div className="n" style={{ color: 'var(--amber)' }}>{r.tag}</div>
              <h3>{r.h}</h3>
              <p>{r.p}</p>
              <Link className="mcta" href={r.href} data-hover style={{ display: 'inline-block', marginTop: 18, color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{r.cta} →</Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- operating-process preview ---- */}
      <section className="block block-wide" style={{ paddingTop: 0 }}>
        <Reveal><div className="sec-kicker">{'//'} How we operate</div></Reveal>
        <Reveal as="h2">Own it, run it, <span className="dim">and keep sharpening it.</span></Reveal>
        <div className="steps">
          <Reveal extraClass="step"><div className="n">01</div><h3>Diagnose</h3><p>We assess where you are across all four pillars and find where visibility and revenue are actually leaking.</p></Reveal>
          <Reveal extraClass="step"><div className="n">02</div><h3>Operate</h3><p>We take ownership and run the connected system — the work prioritized by what is most likely to move your numbers.</p></Reveal>
          <Reveal extraClass="step"><div className="n">03</div><h3>Improve</h3><p>We report clearly, review priorities on a rhythm, and keep doubling down on what pays. Prioritized work never feels invisible.</p></Reveal>
        </div>
      </section>

      {/* ---- illustrative transformation (LABELED sample, not a client result) ---- */}
      <div className="beam-section">
        <div className="inner">
          <Reveal><div className="sec-kicker">{'//'} Illustrative</div></Reveal>
          <Reveal as="h2">The difference between existing <span className="dim">and being found.</span></Reveal>
          <Reveal><div className="illustrative-note">Illustrative sample — a representative scenario, not a specific client result.</div></Reveal>
          <BeamSlider />
          <div className="beam-hint">← DRAG THE BEAM →</div>
        </div>
      </div>

      {/* ---- FAQ ---- */}
      <section className="block">
        <Reveal><div className="sec-kicker">{'//'} Questions</div></Reveal>
        <Reveal as="h2">The short answers <span className="dim">before you dig in.</span></Reveal>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary data-hover>{f.q}</summary>
              <div className="fa">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ---- factual legitimacy statement (no bios, no history padding) ---- */}
      <div className="legit">
        <div className="legit-inner">
          <div className="lk">{'//'} What Updigitly is</div>
          <p>
            Updigitly is a managed digital growth partner. We operate a connected marketing system for businesses of
            every size — from a first real presence to a complete re-platform — and are accountable for the growth it
            produces. Work is <b>senior-led</b>, tracked to clear numbers, and operated by one team end to end.
          </p>
        </div>
      </div>

      {/* ---- final: pricing + strategy-call paths (contact beat) ---- */}
      <section className="final">
        <Reveal><div className="sec-kicker">{'//'} Ready when you are</div></Reveal>
        <Reveal as="h2">See the plans,<br />or talk it through first.</Reveal>
        <Reveal><MagneticButton href="/pricing">View plans <span className="arrow">→</span></MagneticButton></Reveal>
        <Reveal><span className="phone">Not sure which fits? <Link href="/strategy-call" style={{ color: 'var(--amber)' }}>Book a strategy call →</Link></span></Reveal>
      </section>

      <Footer />
    </>
  );
}
