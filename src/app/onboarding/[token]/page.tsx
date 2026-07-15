import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';
import { getOnboardingByToken, getEnrollmentById } from '@/lib/repo';
import { answerLabel } from '@/lib/enrollment';
import { PLANS, BILLING } from '@/lib/plans';
import type { OnboardingAnswers } from '@/lib/onboarding';
import { siteConfig } from '@/config/site';

/**
 * PREFILLED ONBOARDING (/onboarding/[secure-token]) — Chat 4.
 * Reuses the `onboarding` table + secure token created the moment payment
 * confirms (see repo.ts `recordStripePayment`). Nothing captured at
 * enrollment (contact, plan, billing, qualifier answers) is asked again —
 * this page displays that as a read-only summary and the form below only
 * collects what's genuinely new (Decision #3/#4).
 *
 * Submitting starts the 7-day fit-review clock (Decision #2): sets
 * `substantial_info_at` + `fit_review_due_at` on the onboarding row.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Onboarding',
  robots: { index: false, follow: false },
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function OnboardingPage({ params }: { params: { token: string } }) {
  const onboarding = await getOnboardingByToken(params.token);
  if (!onboarding) notFound();

  const enrollment = await getEnrollmentById(onboarding.enrollmentId);
  if (!enrollment) notFound();

  // Defensive only — the onboarding row is created the moment payment
  // confirms, so this should never be reachable in practice.
  if (enrollment.status !== 'paid') {
    return (
      <>
        <Nav active="/pricing" />
        <div className="contact-wrap review-wrap">
          <div className="kicker">{'//'} Onboarding</div>
          <h1 style={{ fontSize: 'clamp(32px,4.6vw,54px)' }}>
            Almost <span className="dim">there.</span>
          </h1>
          <p className="sub">
            We&rsquo;re still confirming your payment — this link activates automatically once that&rsquo;s done. If you
            just paid, refresh in a moment. Questions? Call{' '}
            <a href={siteConfig.phone.href} style={{ color: 'var(--amber)' }}>
              {siteConfig.phone.display}
            </a>
            .
          </p>
        </div>
        <Footer />
      </>
    );
  }

  const planName = PLANS.find((p) => p.key === enrollment.planKey)?.name ?? enrollment.planKey;
  const billingLabel = BILLING[enrollment.billingKey]?.label ?? enrollment.billingKey;
  const q = enrollment.qualifier;
  const submitted = onboarding.status === 'submitted';

  return (
    <>
      <Nav active="/pricing" />

      <div className="contact-wrap review-wrap">
        <div className="kicker">{'//'} Onboarding</div>
        <h1 style={{ fontSize: 'clamp(32px,4.6vw,54px)' }}>
          Let&rsquo;s get {enrollment.businessName} <span className="dim">moving.</span>
        </h1>
        <p className="sub">
          We already have everything from your enrollment — nothing below is asked twice. This adds the last details
          we need before work begins.
        </p>

        <div className="review-panel" style={{ marginTop: 36 }}>
          <div className="review-head">
            <div>
              <div className="rp-plan">{planName}</div>
              <div className="rp-sub">What we already have on file</div>
            </div>
          </div>
          <ul className="confirm-list" style={{ border: 'none', borderRadius: 0, marginTop: 0 }}>
            <li>
              <span className="ci-lbl">Business</span>
              <span className="ci-val">
                {enrollment.businessName} · {enrollment.contactName}
              </span>
            </li>
            <li>
              <span className="ci-lbl">Plan &amp; billing</span>
              <span className="ci-val">
                {planName} · {billingLabel}
              </span>
            </li>
            <li>
              <span className="ci-lbl">Locations</span>
              <span className="ci-val">{answerLabel('locations', q.locations)}</span>
            </li>
            <li>
              <span className="ci-lbl">Website</span>
              <span className="ci-val">{answerLabel('website', q.website)}</span>
            </li>
            <li>
              <span className="ci-lbl">CRM</span>
              <span className="ci-val">{answerLabel('crm', q.crm)}</span>
            </li>
          </ul>
        </div>

        {submitted ? (
          <div style={{ marginTop: 28 }}>
            <span className="accepted-flag">
              <span className="pulse" style={{ background: 'var(--green)' }} />
              Onboarding info received
            </span>
            <div className="review-panel" style={{ marginTop: 22 }}>
              <div className="disc-full">
                <div className="dc-lbl">Fit review</div>
                <p>
                  We review fit within 7 days of this submission (due {fmtDate(onboarding.fitReviewDueAt)}), before
                  any heavy build begins. If the plan can&rsquo;t deliver the core engagement as presented, we&rsquo;ll
                  contact you and provide a fair resolution.
                </p>
              </div>
              <div className="disc-full">
                <div className="dc-lbl">Status</div>
                <p className="dim" style={{ textTransform: 'capitalize' }}>
                  {onboarding.fitReviewStatus}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 36 }}>
            <OnboardingForm token={params.token} initial={onboarding.answers as Partial<OnboardingAnswers>} />
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
