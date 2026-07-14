import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Legal',
  description:
    'Updigitly legal — privacy, website terms, service & billing terms, cancellation & fair resolution, and required disclosures.',
};

/**
 * LEGAL (/legal) — ONE consolidated page, LOCKED section groups (Decision #3):
 * privacy · website terms · service + billing terms · cancellation · required
 * disclosures. This is a SCAFFOLD (Chat 1): structure is final and billing
 * language reflects the LOCKED pricing model, but bracketed items and the
 * counsel review are unresolved. Counsel-approved content is a PREREQUISITE for
 * the Phase 3 flip (Chat 5) — do not launch on this scaffold.
 */

const EFFECTIVE_DATE = '[effective date — set at launch]';

const TOC = [
  { id: 'privacy', label: 'Privacy' },
  { id: 'website-terms', label: 'Website Terms' },
  { id: 'service-billing', label: 'Service & Billing Terms' },
  { id: 'cancellation', label: 'Cancellation & Fair Resolution' },
  { id: 'disclosures', label: 'Required Disclosures' },
];

export default function LegalPage() {
  return (
    <>
      <Nav />

      <header className="head left">
        <div className="inner" style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="kicker">{'//'} Legal</div>
          <h1 style={{ maxWidth: 900 }}>Legal <span className="dim">& terms.</span></h1>
          <p style={{ color: 'var(--slate)', fontSize: 18, lineHeight: 1.7, maxWidth: 620, marginTop: 30 }}>
            Privacy, website terms, service &amp; billing terms, cancellation, and required disclosures — in one place.
          </p>
        </div>
      </header>

      <div className="legal-wrap">
        <div className="legal-updated">Effective date: {EFFECTIVE_DATE}</div>

        <div className="legal-note">
          SCAFFOLD — not launch-ready. Items in <code>[brackets]</code> need the real legal entity name, business
          address, governing-law state, and contact email. This page must be reviewed and approved by counsel before
          the Phase 3 domain flip; until then the live site keeps its existing legal stub.
        </div>

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
            This section explains how <b>[Updigitly legal entity]</b> (&ldquo;Updigitly,&rdquo; &ldquo;we,&rdquo;
            &ldquo;us&rdquo;) collects, uses, and protects information when you visit {siteConfig.url}, submit a form,
            book a strategy call, enroll in a plan, or become a client.
          </p>
          <h3>Information we collect</h3>
          <ul>
            <li>Details you provide directly — name, business, email, phone, and anything you write in a form, qualifier, or message.</li>
            <li>Enrollment information — selected plan, qualifier answers, and disclosure acceptance, stored as our canonical record.</li>
            <li>For paid plans, billing information handled by our payment processor — we do not collect or store full card numbers ourselves.</li>
            <li>Standard technical data (IP, browser, device, pages viewed) via ordinary server and hosting logs.</li>
          </ul>
          <h3>How we use it</h3>
          <ul>
            <li>To respond to enquiries, schedule strategy calls, deliver and operate the services you enroll in, and send account and service communications.</li>
            <li>To maintain, secure, and improve the site and our services, and to meet legal and contractual obligations.</li>
          </ul>
          <p>We do not sell your personal information.</p>
          <h3>Service providers</h3>
          <p>
            We rely on established providers, each processing information under its own policies: our database/hosting
            provider, our CRM and communications platform, our payment processor, our bot-protection provider, and our
            web-font provider. <b>[Confirm the final provider list with counsel.]</b>
          </p>
          <h3>Cookies, retention, rights &amp; security</h3>
          <p>
            We use functional cookies needed for the site and embedded tools to work; we do not currently run
            advertising trackers, and will update this page before any such tracking goes live. We retain information
            as long as needed to deliver services and meet legal obligations. You may request access, correction, or
            deletion, subject to applicable law (e.g. CCPA/GDPR). We use reasonable safeguards, though no system is
            perfectly secure. This site is intended for those 18 and older.
          </p>
        </Reveal>

        {/* ===================== WEBSITE TERMS ===================== */}
        <section className="legal-section">
          <h2 id="website-terms">Website Terms</h2>
          <p>
            By using {siteConfig.url}, you agree to these terms. You confirm you are at least 18 and, where enrolling
            on behalf of a business, authorized to do so.
          </p>
          <h3>Acceptable use &amp; intellectual property</h3>
          <p>
            Don&rsquo;t misuse the site — no attempting to access data that isn&rsquo;t yours, disrupting operation, or
            unlawful use. The site&rsquo;s design, content, and branding are owned by Updigitly. Ownership of client
            deliverables is governed by the applicable plan or signed agreement.
          </p>
          <h3>Disclaimers &amp; liability</h3>
          <p>
            The site and services are provided &ldquo;as is,&rdquo; without warranties to the fullest extent permitted
            by law. To that extent, Updigitly is not liable for indirect or consequential damages, and total liability
            for any claim will not exceed the amount paid to us in the twelve months before the claim. You agree to
            indemnify Updigitly against claims arising from your misuse of the site or breach of these terms. These
            terms are governed by the laws of the State of <b>[governing-law state]</b>.
          </p>
        </section>

        {/* ===================== SERVICE & BILLING ===================== */}
        <section className="legal-section">
          <h2 id="service-billing">Service &amp; Billing Terms</h2>
          <p>
            Updigitly provides managed digital growth services — foundation, visibility, growth, and intelligence —
            delivered as an ongoing managed engagement, as described on the Pricing and System pages.
          </p>
          <h3>Plans, pricing &amp; the initial term</h3>
          <ul>
            <li><b>Every plan carries a 6-month initial service commitment.</b> &ldquo;Monthly&rdquo; is a payment schedule, not a one-month term.</li>
            <li>Billing options: monthly; 6-month prepaid (10% off); or annual prepaid (20% off). Discounts apply to prepayment; the initial commitment is the same across all three.</li>
            <li>The immediate charge, recurring charge, initial term, minimum total obligation, and renewal behavior are shown clearly before payment.</li>
            <li>Advertising spend is billed separately; some third-party software or production may be additional. Final scope is defined in your service agreement.</li>
          </ul>
          <h3>Renewal</h3>
          <p>
            After the initial term, plans continue month-to-month and prepaid terms may renew — but never silently.
            Renewal notices are sent in advance (approximately 30 days before, with a second reminder about 7 days
            before), each showing the exact date, amount, and how to disable auto-renewal.
          </p>
          <h3>No guaranteed results</h3>
          <p>
            Marketing, SEO, and advertising outcomes depend on factors outside our control. We do not guarantee
            specific rankings, lead volume, or revenue.
          </p>
        </section>

        {/* ===================== CANCELLATION & FAIR RESOLUTION ===================== */}
        <section className="legal-section">
          <h2 id="cancellation">Cancellation &amp; Fair Resolution</h2>
          <p>
            You may disable auto-renewal before your next billing date once the initial term is complete; cancellation
            takes effect at the end of the current paid period. Prepaid multi-month terms are generally non-refundable
            for the remaining term once work has begun, except as required by law or as provided below.
          </p>
          <h3>Fair resolution</h3>
          <p>
            We do not offer a general money-back guarantee. What we commit to: <b>if we determine during onboarding
            that the selected plan cannot deliver the core engagement as presented, we will contact you and provide a
            fair resolution</b> — which, depending on how far work has progressed, may be a full refund, a credit
            toward a revised engagement, or a partial resolution. All resolutions are subject to human review.
          </p>
          <h3>Non-payment</h3>
          <p>
            Non-payment is handled in stages (reminders, then a pause of active work, then possible suspension, then
            possible termination with export per the agreement). Suspension does not release the remaining term
            obligation. <b>[Confirm exact windows and amounts with counsel.]</b>
          </p>
        </section>

        {/* ===================== REQUIRED DISCLOSURES ===================== */}
        <section className="legal-section">
          <h2 id="disclosures">Required Disclosures</h2>
          <h3>Communications consent</h3>
          <p>
            When you submit a form, book a call, or enroll, you consent to be contacted by phone, email, or SMS about
            your enquiry or service, including through automated systems. Message and data rates may apply, and you can
            opt out at any time.
          </p>
          <h3>Contact</h3>
          <p>
            Questions about anything on this page? Reach us at <b>[legal/contact email]</b> or call{' '}
            <b>{siteConfig.phone.display}</b>.
          </p>
          <div className="legal-note" style={{ marginTop: 24 }}>
            Counsel to confirm: legal entity name, business address, governing-law state, contact email, exact
            non-payment windows, refund/renewal language, and number-portability + data-export terms before launch.
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
