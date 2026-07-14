import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { ConfirmationPending } from '@/components/enroll/ConfirmationPending';
import { getEnrollmentBySecureId, getLatestAcceptance } from '@/lib/repo';
import { usd } from '@/lib/plans';
import { siteConfig } from '@/config/site';

/**
 * CONFIRMATION (/enroll/confirmation?ref=<secure-id>) — Decision #3 + #4 rev.
 * Renders from the persisted enrollment. Payment is confirmed by the Stripe
 * WEBHOOK, never by this redirect: until the enrollment is `paid`, this shows a
 * self-polling "confirming…" state (ConfirmationPending) and only reveals the
 * confirmed details once the webhook has activated the enrollment.
 *
 * As a static segment, /enroll/confirmation takes priority over the sibling
 * dynamic /enroll/[token] route.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Enrollment confirmed',
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({ searchParams }: { searchParams: { ref?: string } }) {
  const ref = searchParams.ref;
  const enrollment = ref ? await getEnrollmentBySecureId(ref) : null;
  const isPaid = enrollment?.status === 'paid';
  const acceptance = isPaid && enrollment ? ((await getLatestAcceptance(enrollment.id)) as any) : null;
  const snap = acceptance?.price_snapshot as any | undefined;

  return (
    <>
      <Nav active="/pricing" />

      <div className="contact-wrap review-wrap">
        {!enrollment ? (
          <>
            <div className="kicker">{'//'} Enrollment</div>
            <h1 style={{ fontSize: 'clamp(32px,4.6vw,54px)' }}>
              We couldn&rsquo;t find that <span className="dim">confirmation.</span>
            </h1>
            <p className="sub">
              This confirmation link looks incomplete. If you just enrolled, check your inbox for the reference, or
              reach us at{' '}
              <a href={siteConfig.phone.href} style={{ color: 'var(--amber)' }}>
                {siteConfig.phone.display}
              </a>{' '}
              and we&rsquo;ll sort it out.
            </p>
            <div className="hero-ctas" style={{ marginTop: 28 }}>
              <Link className="btn-ghost" href="/pricing" data-hover>
                <span className="pulse" />View plans →
              </Link>
            </div>
          </>
        ) : !isPaid ? (
          <ConfirmationPending secureId={enrollment.secureId} />
        ) : (
          <>
            <div className="confirm-check" aria-hidden="true">
              ✓
            </div>
            <div className="kicker" style={{ marginTop: 22 }}>
              {'//'} Enrollment confirmed
            </div>
            <h1 style={{ fontSize: 'clamp(32px,4.6vw,54px)' }}>
              You&rsquo;re in, <span className="dim">{enrollment.contactName.split(' ')[0]}.</span>
            </h1>
            <p className="sub">
              Thanks for enrolling {enrollment.businessName} in {snap?.planName ?? enrollment.planKey}. Here&rsquo;s
              what happens next — no action needed from you right now.
            </p>

            <ul className="confirm-list">
              <li>
                <span className="ci-lbl">Plan &amp; billing</span>
                <span className="ci-val">
                  {snap?.planName ?? enrollment.planKey}
                  {snap?.billingLabel ? ` · ${snap.billingLabel}` : ''}
                </span>
              </li>
              {snap && (
                <li>
                  <span className="ci-lbl">Commitment</span>
                  <span className="ci-val">
                    {snap.initialTermMonths}-month initial term · minimum obligation {usd(snap.minCommitment)}
                  </span>
                </li>
              )}
              <li>
                <span className="ci-lbl">Onboarding</span>
                <span className="ci-val">
                  We&rsquo;ll send your onboarding link so we can gather the last details — we reuse everything you
                  already told us, so nothing is asked twice.
                </span>
              </li>
              <li>
                <span className="ci-lbl">Fit review</span>
                <span className="ci-val">
                  We review fit early in onboarding, before any heavy build. If the plan can&rsquo;t deliver the core
                  engagement as presented, we contact you and provide a fair resolution.
                </span>
              </li>
              <li>
                <span className="ci-lbl">Support</span>
                <span className="ci-val">
                  Call{' '}
                  <a href={siteConfig.phone.href} style={{ color: 'var(--green)' }}>
                    {siteConfig.phone.display}
                  </a>{' '}
                  or email{' '}
                  <a href={siteConfig.email.href} style={{ color: 'var(--green)' }}>
                    {siteConfig.email.display}
                  </a>
                  .
                </span>
              </li>
              <li>
                <span className="ci-lbl">Reference</span>
                <span className="ci-val" style={{ fontFamily: 'var(--font-mono),monospace', fontSize: 13 }}>
                  {enrollment.secureId}
                </span>
              </li>
            </ul>

            <p className="q-fine" style={{ marginTop: 22 }}>
              Your payment is confirmed and your enrollment is active. Billing is handled securely by Stripe. Keep
              your reference for any questions.
            </p>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}
