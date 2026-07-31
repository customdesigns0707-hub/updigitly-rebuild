import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
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
  AGREEMENT_VERSION,
} from '@/config/legal';
import { INITIAL_TERM_MONTHS } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'Service Order & Agreement',
  description:
    'The combined Service Order and Agreement for Updigitly managed growth engagements — reviewed and accepted before payment.',
  robots: { index: false, follow: false },
};

/**
 * SERVICE ORDER + AGREEMENT (/legal/agreement) — the ONE combined document a
 * client reviews and accepts before payment (interim legal architecture,
 * 2026-07-28). Not a 20-page MSA; a single readable agreement covering the 14
 * required points. The plan, dates, and price specific to a given order (the
 * "Service Order" specifics) are shown on the enrollment review + confirmation
 * pages and recorded as acceptance evidence; this page is the standard terms
 * they attach to. Contracting party is Joby Gran, an individual doing business
 * as Updigitly (a sole proprietor / individual DBA); Arizona governing law. No
 * acceleration / arbitration / liquidated-damages language — those wait for
 * counsel. No assignment-to-successor-entity clause — explicitly decided
 * against by the operator, not an open item. Versioned via AGREEMENT_VERSION.
 */

export default function AgreementPage() {
  return (
    <>
      <Nav />

      <header className="head left">
        <div className="inner" style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="kicker">{'//'} Service Order &amp; Agreement</div>
          <h1 style={{ maxWidth: 900 }}>Service Order <span className="dim">&amp; Agreement.</span></h1>
          <p style={{ color: 'var(--slate)', fontSize: 18, lineHeight: 1.7, maxWidth: 640, marginTop: 30 }}>
            The complete terms of a paid engagement — in plain language, on one page. You review and accept this before
            any payment is taken.
          </p>
        </div>
      </header>

      <div className="legal-wrap">
        <div className="legal-updated">
          Version {AGREEMENT_VERSION} · Effective date: {EFFECTIVE_DATE_DISPLAY}
        </div>

        <section className="legal-section">
          <p>
            This Service Order and Agreement (the &ldquo;Agreement&rdquo;) is between <b>{ENTITY_DESCRIPTOR}</b> (&ldquo;
            {ENTITY_SHORT},&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;), of {BUSINESS_ADDRESS.oneLine}, and the business
            that enrolls (the &ldquo;Client,&rdquo; &ldquo;you&rdquo;). The specific commercial terms of your order —
            the plan you selected, the start date, the fixed end date, the amount charged today, the recurring charge,
            and the minimum total obligation (together, your &ldquo;Order&rdquo;) — are shown on your enrollment review
            and confirmation and are recorded with your acceptance. Those Order details and these terms together form
            one agreement.
          </p>
        </section>

        <section className="legal-section">
          <h2>1. The parties and your authority</h2>
          <p>
            You confirm that the business named in your Order is the contracting party, that the information you
            provided is accurate, and that the person accepting this Agreement is authorized to enter into it on that
            business&rsquo;s behalf.
          </p>

          <h2>2. Services and plan</h2>
          <p>
            We provide managed digital growth services across four areas — foundation, visibility, growth, and
            intelligence — at the depth of the plan identified in your Order (Essential or Growth Engine), as described
            on our{' '}
            <Link href="/pricing" style={{ color: 'var(--green)' }}>Pricing</Link> and{' '}
            <Link href="/system" style={{ color: 'var(--green)' }}>System</Link> pages. We prioritize and manage the
            work most likely to improve performance for your plan; work is operated on your behalf on an ongoing basis
            rather than as a fixed list of tasks. Additional locations, brands, channels, production, and specialized
            systems are outside standard scope and are handled under Section 7.
          </p>

          <h2>3. Term — fixed start and end dates</h2>
          <p>
            Your engagement begins on the start date shown in your Order and runs for a fixed initial term of{' '}
            {INITIAL_TERM_MONTHS} months, ending on the end date shown in your Order (the &ldquo;Initial Term&rdquo;).
            You commit to the full Initial Term. If you stop payment during the Initial Term, you remain responsible
            for the fees for the Initial Term as they come due under your payment schedule, and we may pause or suspend
            services as described in Section 11. We are not adding any early-termination penalty or accelerated
            lump-sum charge beyond the fees you already committed to for the Initial Term.
          </p>

          <h2>4. Fees, payment schedule, and total obligation</h2>
          <p>
            You pay the fees on the schedule shown in your Order: either monthly for the Initial Term, or a single
            prepayment (6-month or annual) covering its period. The amount charged today, the recurring charge, and
            the minimum total obligation for the Initial Term are all shown to you before you pay. Payments are
            processed securely by our payment processor; we do not store full card numbers. Advertising spend and any
            third-party software or production costs are separate and are approved under Section 7 before they are
            incurred.
          </p>

          <h2>5. No automatic renewal</h2>
          <p>
            This Agreement does <b>not</b> automatically renew. On the monthly option, your scheduled payments run for
            the Initial Term and then stop. On a prepaid option, your single prepayment covers its period and nothing
            further is charged. Any continuation of services after the Initial Term is a new engagement that we and you
            agree to separately — we will not roll you into another term or charge you again without a fresh agreement.
          </p>

          <h2>6. Refunds</h2>
          <p>
            Payments are non-refundable once services have begun, except: (a) if we decline your engagement before
            substantive work begins, we refund your payment; and (b) if we materially fail to provide an agreed
            service, we will first have a reasonable opportunity to correct it, and if it is not corrected, we may
            provide an appropriate credit or a prorated refund for the undelivered portion. This does not limit any
            rights you have under applicable law.
          </p>

          <h2>7. Additional work and costs</h2>
          <p>
            If you request work beyond your plan&rsquo;s standard scope, or if a goal you ask us to pursue requires
            paid media, third-party software, or production, we will describe it and its cost to you first. No
            additional charge is activated without your approval.
          </p>

          <h2>8. Your responsibilities</h2>
          <p>
            To let us do the work, you agree to cooperate reasonably: provide timely access to the accounts, assets,
            and information we need; review and respond to requests within a reasonable time; and ensure you have the
            rights to any materials you give us. Delays in access or approvals may delay results; they do not change
            your payment obligations.
          </p>

          <h2>9. No guaranteed results</h2>
          <p>
            Marketing, SEO, and advertising outcomes depend on many factors outside our control. We do not guarantee
            specific rankings, lead volume, sales, or revenue. We commit to operating your plan competently and
            attentively.
          </p>

          <h2>10. Ownership and account access</h2>
          <p>
            Your business data remains yours. Accounts and profiles created in your name or on your platforms remain
            yours, and we will not hold them hostage. Our own frameworks, templates, automations, and operating
            methods remain ours. Where we create custom, client-funded deliverables, ownership is as stated in your
            Order or as separately agreed. On the end of the engagement, we will provide reasonable assistance to hand
            over your business data and account access.
          </p>

          <h2>11. Suspension for non-payment</h2>
          <p>
            If a scheduled payment is missed, we will contact you and provide a short opportunity to resolve it.
            Continued non-payment may lead us to pause active work and, after that, suspend services. A pause or
            suspension does not by itself release the remaining fees owed for the Initial Term.
          </p>

          <h2>12. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, neither party is liable to the other for indirect, incidental,
            special, or consequential damages, or for lost profits or lost revenue. Except for your payment
            obligations, each party&rsquo;s total liability under this Agreement will not exceed the total fees you
            paid to us under this Agreement during the three (3) months immediately before the event giving rise to
            the claim. Nothing in this section limits liability that cannot be limited under applicable law.
          </p>

          <h2>13. Governing law and venue</h2>
          <p>
            This Agreement is governed by the laws of the State of {GOVERNING_LAW_STATE}, without regard to its
            conflict-of-laws rules. Any dispute will be brought exclusively in {VENUE}, and each party consents to that
            jurisdiction.
          </p>

          <h2>14. Electronic acceptance</h2>
          <p>
            You accept this Agreement electronically, before payment, by checking the acceptance box on the enrollment
            review page. That electronic acceptance is legally effective and enforceable. We record the version of this
            Agreement, your plan and price, the date and time, and your payment reference as evidence of what you
            accepted.
          </p>

          <h2>Contact</h2>
          <p>
            {ENTITY_NAME}, {BUSINESS_ADDRESS.oneLine}. Legal notices:{' '}
            <a href={`mailto:${LEGAL_EMAILS.legal}`} style={{ color: 'var(--green)' }}>{LEGAL_EMAILS.legal}</a>.
            Billing:{' '}
            <a href={`mailto:${LEGAL_EMAILS.billing}`} style={{ color: 'var(--green)' }}>{LEGAL_EMAILS.billing}</a>{' '}
            or{' '}
            <a href={siteConfig.phone.href} style={{ color: 'var(--amber)' }}>{siteConfig.phone.display}</a>. See also
            our{' '}
            <Link href="/legal" style={{ color: 'var(--green)' }}>privacy policy and website terms</Link>.
          </p>
        </section>
      </div>

      <Footer />
    </>
  );
}
