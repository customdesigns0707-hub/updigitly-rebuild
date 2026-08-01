import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { siteConfig } from '@/config/site';
import {
  ENTITY_NAME,
  ENTITY_DESCRIPTOR,
  ENTITY_SHORT,
  EFFECTIVE_DATE_DISPLAY,
  BUSINESS_ADDRESS,
  GOVERNING_LAW_STATE,
  VENUE,
  LEGAL_EMAILS,
  PROCESSORS,
} from '@/config/legal';

export const metadata: Metadata = {
  title: 'Legal',
  description:
    'Updigitly legal — privacy, website terms, service & billing terms, cancellation & refunds, and required disclosures.',
  robots: { index: false, follow: false },
};

/**
 * LEGAL (/legal) — ONE consolidated page, LOCKED section groups (Decision #3):
 * privacy · website terms · service + billing terms · cancellation · required
 * disclosures. Content implements the LOCKED interim legal architecture
 * (2026-07-28): a truthful privacy policy, no automated SMS, fixed-term billing
 * with NO automatic renewal, and an objective refund policy. The full combined
 * Service Order + Agreement lives at /legal/agreement.
 *
 * The contracting/operating party is Joby Gran, an individual doing business as
 * Updigitly (a sole proprietor / individual DBA — see src/config/legal.ts). The
 * only value set at publication is the effective date; nothing on this page is
 * provisional.
 */

const TOC = [
  { id: 'privacy', label: 'Privacy' },
  { id: 'website-terms', label: 'Website Terms' },
  { id: 'service-billing', label: 'Service & Billing Terms' },
  { id: 'cancellation', label: 'Cancellation & Refunds' },
  { id: 'disclosures', label: 'Required Disclosures' },
];

export default function LegalPage() {
  return (
    <>
      <Nav />

      <header className="head left">
        <div className="inner" style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="kicker">{'//'} Legal</div>
          <h1 style={{ maxWidth: 900 }}>Legal <span className="dim">&amp; terms.</span></h1>
          <p style={{ color: 'var(--slate)', fontSize: 18, lineHeight: 1.7, maxWidth: 620, marginTop: 30 }}>
            Privacy, website terms, service &amp; billing terms, cancellation, and required disclosures — in one place.
          </p>
        </div>
      </header>

      <div className="legal-wrap">
        <div className="legal-updated">Effective date: {EFFECTIVE_DATE_DISPLAY}</div>

        <Reveal className="legal-toc">
          <div className="lbl">{'//'} On this page</div>
          <ol>
            {TOC.map((t) => (
              <li key={t.id}><a href={`#${t.id}`} data-hover>{t.label}</a></li>
            ))}
          </ol>
        </Reveal>

        {/* ===================== PRIVACY ===================== */}
        <Reveal as="section" className="legal-section" extraClass="reveal">
          <h2 id="privacy">Privacy</h2>
          <p>
            This site is operated by <b>{ENTITY_DESCRIPTOR}</b> (&ldquo;{ENTITY_SHORT},&rdquo; &ldquo;we,&rdquo;
            &ldquo;us&rdquo;), located at {BUSINESS_ADDRESS.oneLine}. This section explains how we collect, use, and
            protect information when you visit {siteConfig.url}, submit a form, book a strategy call, enroll in a plan,
            or become a client.
          </p>
          <h3>Information we collect</h3>
          <ul>
            <li>Details you provide directly — name, business, email, phone, and anything you write in a form, qualifier, or message.</li>
            <li>Enrollment information — the plan you select, your qualifier answers, and your recorded acceptance of the Service Order and Agreement, kept as our canonical record.</li>
            <li>Billing information for paid plans, handled by our payment processor. We do not collect or store full card numbers on our own systems.</li>
            <li>Standard technical data (IP address, browser, device, pages viewed) via ordinary server and hosting logs.</li>
          </ul>
          <h3>How we use it</h3>
          <ul>
            <li>To respond to enquiries, schedule strategy calls, deliver and operate the services you enroll in, and send account and service communications.</li>
            <li>To maintain, secure, and improve the site and our services, and to meet our legal and contractual obligations.</li>
          </ul>
          <p>We do not sell your personal information.</p>
          <h3>Service providers</h3>
          <p>
            We rely on established providers to run our business, each processing information only as needed to provide
            its service and under its own terms and privacy policy:
          </p>
          <ul>
            {PROCESSORS.map((p) => (
              <li key={p.name}><b>{p.name}</b> — {p.role}.</li>
            ))}
          </ul>
          <h3>Cookies, retention, your rights &amp; security</h3>
          <p>
            We use functional cookies needed for the site and its embedded tools to work. We do not currently run
            advertising or cross-site tracking pixels; if that changes, we will update this page before any such
            tracking goes live. We retain information for as long as needed to deliver services and meet legal
            obligations, then dispose of it. You may request access to, correction of, or deletion of your personal
            information, subject to applicable law (including the CCPA/CPRA and GDPR where they apply); to make a
            request, email{' '}
            <a href={`mailto:${LEGAL_EMAILS.privacy}`} style={{ color: 'var(--green)' }}>{LEGAL_EMAILS.privacy}</a>.
            We use reasonable administrative and technical safeguards to protect information, though no method of
            transmission or storage is perfectly secure. This site is intended for people 18 and older, and is not
            directed to children.
          </p>
        </Reveal>

        {/* ===================== WEBSITE TERMS ===================== */}
        <section className="legal-section">
          <h2 id="website-terms">Website Terms</h2>
          <p>
            By using {siteConfig.url}, you agree to these terms. You confirm you are at least 18 and, where enrolling
            on behalf of a business, that you are authorized to do so.
          </p>
          <h3>Acceptable use &amp; intellectual property</h3>
          <p>
            Please don&rsquo;t misuse the site — no attempting to access data that isn&rsquo;t yours, disrupting its
            operation, or using it unlawfully. The site&rsquo;s design, content, and branding are owned by {ENTITY_SHORT}.
            Ownership of client deliverables is governed by the Service Order and Agreement that applies to your
            engagement.
          </p>
          <h3>Disclaimers &amp; liability</h3>
          <p>
            The site is provided &ldquo;as is,&rdquo; without warranties to the fullest extent permitted by law. To
            that extent, {ENTITY_SHORT} is not liable for indirect, incidental, or consequential damages arising from
            your use of the site, and our total liability for any claim relating to the site will not exceed one
            hundred U.S. dollars ($100). Liability relating to paid services is governed by the Service Order and
            Agreement, not by these website terms. These website terms are governed by the laws of the State of{' '}
            {GOVERNING_LAW_STATE}, and you agree to the exclusive jurisdiction of {VENUE}.
          </p>
        </section>

        {/* ===================== SERVICE & BILLING ===================== */}
        <section className="legal-section">
          <h2 id="service-billing">Service &amp; Billing Terms</h2>
          <p>
            {ENTITY_SHORT} provides managed digital growth services — foundation, visibility, growth, and intelligence
            — as an ongoing managed engagement, as described on the Pricing and System pages. The complete terms of a
            paid engagement are set out in the combined{' '}
            <Link href="/legal/agreement" style={{ color: 'var(--green)' }}>Service Order and Agreement</Link>, which
            you review and accept before any payment.
          </p>
          <h3>Plans, pricing &amp; the initial term</h3>
          <ul>
            <li><b>Every plan carries a 6-month initial service commitment.</b> &ldquo;Monthly&rdquo; is a payment schedule, not a one-month term.</li>
            <li>Billing options: monthly; 6-month prepaid (10% off); or annual prepaid (20% off). The discount applies to prepayment; the 6-month initial commitment is the same across all three.</li>
            <li>The amount charged today, the recurring charge, the initial term, and the minimum total obligation are shown clearly before you pay.</li>
            <li>Advertising spend is billed separately, and some third-party software or production may be additional. Final scope is defined in your Service Order and Agreement.</li>
          </ul>
          <h3>No automatic renewal</h3>
          <p>
            Plans do <b>not</b> automatically renew. Billing is a fixed term: on the monthly option, the scheduled
            payments run for the term and then stop; on a prepaid option, the single prepayment covers its term and
            nothing further is charged. Continuing service after the term is a new, separately agreed engagement — we
            do not silently roll you into another term or charge you without a fresh agreement.
          </p>
          <h3>No guaranteed results</h3>
          <p>
            Marketing, SEO, and advertising outcomes depend on many factors outside our control. We do not guarantee
            specific rankings, lead volume, or revenue.
          </p>
        </section>

        {/* ===================== CANCELLATION & REFUNDS ===================== */}
        <section className="legal-section">
          <h2 id="cancellation">Cancellation &amp; Refunds</h2>
          <p>
            Because plans do not auto-renew, there is nothing to &ldquo;cancel&rdquo; to avoid a future term — billing
            ends on its own at the end of the term you purchased. Within a term, you have made a 6-month initial
            service commitment, and payments are handled as described below.
          </p>
          <h3>Refunds</h3>
          <p>
            Payments are non-refundable once services have begun, except as follows and except where a refund is
            required by law:
          </p>
          <ul>
            <li>If {ENTITY_SHORT} declines the engagement before substantive work begins, your payment is refunded.</li>
            <li>If {ENTITY_SHORT} materially fails to provide an agreed service, we will first have a reasonable opportunity to correct it; if it is not corrected, an appropriate credit or a prorated refund may be provided for the undelivered portion.</li>
          </ul>
          <p>
            This policy does not limit any rights you have under applicable law. Full terms are in the{' '}
            <Link href="/legal/agreement" style={{ color: 'var(--green)' }}>Service Order and Agreement</Link>.
          </p>
          <h3>Non-payment</h3>
          <p>
            If a scheduled payment is missed, we contact you and provide a short opportunity to resolve it. Continued
            non-payment may lead to a pause of active work and, after that, suspension of services. A pause or
            suspension does not by itself release the remaining balance of the initial term. Details are in the
            Service Order and Agreement.
          </p>
        </section>

        {/* ===================== REQUIRED DISCLOSURES ===================== */}
        <section className="legal-section">
          <h2 id="disclosures">Required Disclosures</h2>
          <h3>How we contact you</h3>
          <p>
            When you submit a form, book a call, or enroll, you consent to be contacted by phone and email about your
            enquiry, your account, and your services. We collect your phone number so we can call you back — we do{' '}
            <b>not</b> send automated or marketing text messages. If we ever introduce SMS messaging, we will obtain
            your consent first and update this page.
          </p>
          <h3>Business identity &amp; contact</h3>
          <p>
            This site and its services are operated by <b>{ENTITY_NAME}</b>, {BUSINESS_ADDRESS.oneLine}. For privacy
            or data requests, email{' '}
            <a href={`mailto:${LEGAL_EMAILS.privacy}`} style={{ color: 'var(--green)' }}>{LEGAL_EMAILS.privacy}</a>.
            For legal notices, email{' '}
            <a href={`mailto:${LEGAL_EMAILS.legal}`} style={{ color: 'var(--green)' }}>{LEGAL_EMAILS.legal}</a>.
            For billing questions, email{' '}
            <a href={`mailto:${LEGAL_EMAILS.billing}`} style={{ color: 'var(--green)' }}>{LEGAL_EMAILS.billing}</a>{' '}
            or call{' '}
            <a href={siteConfig.phone.href} style={{ color: 'var(--amber)' }}>{siteConfig.phone.display}</a>.
          </p>
          <p className="dim">
            Governing law: the State of {GOVERNING_LAW_STATE}. Venue: {VENUE}.
          </p>
        </section>
      </div>

      <Footer />
    </>
  );
}
