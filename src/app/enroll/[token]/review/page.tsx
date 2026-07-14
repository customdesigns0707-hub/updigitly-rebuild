import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Placeholder } from '@/components/Placeholder';
import { BillingSwitch } from '@/components/enroll/BillingSwitch';
import { AcceptPanel } from '@/components/enroll/AcceptPanel';
import { getEnrollmentBySecureId } from '@/lib/repo';
import { buildPriceSnapshot, DISCLOSURE_VERSION } from '@/lib/enrollment';
import { usd } from '@/lib/plans';
import { siteConfig } from '@/config/site';

/**
 * COMMITMENT / DISCLOSURE REVIEW (/enroll/[secure-id]/review) — Decision #4.
 * Shows, LOUDLY and before any payment step: plan, billing option, the charge
 * today, the recurring charge, the 6-month initial term, the minimum total
 * obligation, renewal behavior, terms links, and the fair-resolution sentence.
 * The visitor actively accepts here; acceptance is frozen as evidence. Payment
 * is Chat 3 — the checkout step below is a marked placeholder.
 *
 * [token] is the enrollment secure-id (shared slug with the plan-entry route).
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review & confirm',
  robots: { index: false, follow: false },
};

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const enrollment = await getEnrollmentBySecureId(params.token);
  if (!enrollment) notFound();

  const s = buildPriceSnapshot(enrollment.planKey, enrollment.billingKey);
  const accepted = enrollment.status !== 'qualifier_submitted';
  const flags = enrollment.complexityFlags ?? [];

  return (
    <>
      <Nav active="/pricing" />

      <div className="contact-wrap review-wrap">
        <div className="kicker">{'//'} Enrollment · Step 2 of 2 · Review</div>
        <h1 style={{ fontSize: 'clamp(32px,4.6vw,54px)' }}>
          Review your <span className="dim">commitment.</span>
        </h1>
        <p className="sub">
          This is exactly what you&rsquo;re agreeing to. Nothing is charged on this page — the secure payment step
          comes after you accept.
        </p>

        <div className="review-panel">
          <div className="review-head">
            <div>
              <div className="rp-plan">{s.planName}</div>
              <div className="rp-sub">
                Commitment disclosure · {DISCLOSURE_VERSION}
                {accepted ? ' · accepted' : ''}
              </div>
            </div>
            <BillingSwitch secureId={enrollment.secureId} current={enrollment.billingKey} disabled={accepted} />
          </div>

          <div className="disc-grid">
            <div className="disc-cell hot">
              <div className="dc-lbl">Charged today</div>
              <div className="dc-val">{usd(s.immediateCharge)}</div>
              <div className="dc-note">
                {s.billingLabel}
                {s.billingKey !== 'monthly' ? ` · covers ${s.coversMonths} months` : ''}
                {s.savings > 0 ? ` · you save ${usd(s.savings)}` : ''}
              </div>
            </div>
            <div className="disc-cell">
              <div className="dc-lbl">Effective monthly</div>
              <div className="dc-val">
                {usd(s.effectiveMonthly, true)}
                <span style={{ fontSize: 14, color: 'var(--slate)', fontWeight: 400 }}>/mo</span>
              </div>
              <div className="dc-note">
                {s.discount > 0 ? `Includes the ${Math.round(s.discount * 100)}% prepay discount.` : 'Billed each month.'}
              </div>
            </div>
          </div>

          <div className="disc-full">
            <div className="dc-lbl">Recurring charge</div>
            <p>{s.recurringText}</p>
          </div>

          <div className="disc-full">
            <div className="dc-lbl">Initial term &amp; minimum obligation</div>
            <p>
              A {s.initialTermMonths}-month initial service commitment applies regardless of billing choice —
              &ldquo;monthly&rdquo; is a payment schedule, not a one-month term. {s.minCommitmentText} If you cancel
              during the initial term, the remaining balance of that term is owed.
            </p>
          </div>

          <div className="disc-full">
            <div className="dc-lbl">Renewal</div>
            <p>{s.renewalBehavior}</p>
          </div>

          <div className="disc-full fair-note">
            <div className="dc-lbl">If the plan isn&rsquo;t the right fit</div>
            <p>{s.fairResolution}</p>
          </div>

          <div className="disc-full">
            <div className="dc-lbl">Terms</div>
            <p className="dim">
              Full privacy, service &amp; billing, and cancellation terms are on the{' '}
              <Link href="/legal" style={{ color: 'var(--green)' }}>
                legal page
              </Link>
              . Questions before you commit? Call{' '}
              <a href={siteConfig.phone.href} style={{ color: 'var(--amber)' }}>
                {siteConfig.phone.display}
              </a>{' '}
              or{' '}
              <Link href="/strategy-call" style={{ color: 'var(--amber)' }}>
                book a strategy call
              </Link>
              .
            </p>
          </div>
        </div>

        {flags.length > 0 && (
          <div className="soft-banner">
            <div className="sb-title">
              <span className="pulse" />A couple of things worth a conversation
            </div>
            <ul>
              {flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p>
              You can continue with {s.planName} — your plan and fit are confirmed during onboarding, and continuing
              here doesn&rsquo;t lock in scope. If you&rsquo;d rather talk it through first,{' '}
              <Link href="/strategy-call" style={{ color: 'var(--amber)' }}>
                book a strategy call
              </Link>{' '}
              and we&rsquo;ll map it out with you.
            </p>
          </div>
        )}

        {accepted ? (
          <div style={{ marginTop: 28 }}>
            <span className="accepted-flag">
              <span className="pulse" style={{ background: 'var(--green)' }} />
              Disclosure accepted — recorded
            </span>
            <div style={{ marginTop: 22 }}>
              <Placeholder badge="SECURE CHECKOUT" title="Secure payment mounts here" chat={3}>
                Your acceptance is recorded. The hard-gated secure checkout — personalized to this plan and
                billing option — is wired in Chat 3. No card details are handled on Updigitly&rsquo;s own stack.
              </Placeholder>
            </div>
          </div>
        ) : (
          <AcceptPanel secureId={enrollment.secureId} />
        )}
      </div>

      <Footer />
    </>
  );
}
