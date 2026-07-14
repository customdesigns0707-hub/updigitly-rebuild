import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { QualifierForm } from '@/components/enroll/QualifierForm';
import { PLANS, BILLING, priceFor, usd, type BillingKey } from '@/lib/plans';
import { isEnrollablePlan } from '@/lib/enrollment';
import { siteConfig } from '@/config/site';
import { turnstile } from '@/lib/env';

/**
 * ENROLLMENT ENTRY (/enroll/essential · /enroll/growth-engine) — the priced-plan
 * entry points and redirect targets for the old /checkout/* routes. Chat 2
 * attaches the real native qualifier here; on submit it persists to Postgres and
 * routes to the private /enroll/[secure-id]/review disclosure page. NO payment
 * happens here (Chat 3). Scale has no enroll route (books via /strategy-call).
 *
 * The dynamic segment is named [token] (shared with [token]/review) because
 * Next.js forbids two different slug names at the same path position. Here the
 * token is a plan key; under /review it is an enrollment secure-id.
 */
export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { token: string } }): Metadata {
  const plan = PLANS.find((p) => p.key === params.token);
  return { title: plan ? `Enroll — ${plan.name}` : 'Enroll', robots: { index: false } };
}

function resolveBilling(v: string | string[] | undefined): BillingKey {
  const key = Array.isArray(v) ? v[0] : v;
  return key && key in BILLING ? (key as BillingKey) : 'monthly';
}

export default function EnrollPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { billing?: string };
}) {
  if (!isEnrollablePlan(params.token)) notFound();
  const plan = PLANS.find((p) => p.key === params.token)!;
  const billing = resolveBilling(searchParams.billing);
  const p = priceFor(plan.base as number, billing);

  return (
    <>
      <Nav active="/pricing" />

      <div className="contact-wrap">
        <div className="kicker">{'//'} Enrollment · Step 1 of 2</div>
        <h1 style={{ fontSize: 'clamp(34px,5vw,60px)' }}>
          Enrolling in <span className="dim">{plan.name}.</span>
        </h1>
        <p className="sub">
          A few quick questions so we start you in the right place. No charge yet — you&rsquo;ll review the full
          commitment and terms on the next step, before anything is billed.
        </p>

        <div className="cols cols--checkout" style={{ marginTop: 56 }}>
          <div>
            <div className="direct" style={{ marginTop: 0 }}>
              <div className="lbl">Your plan</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 26,
                  fontWeight: 700,
                  marginTop: 10,
                }}
              >
                {plan.name}
              </div>
              <div style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 20 }}>
                {usd(p.effectiveMonthly, true)}
                <span style={{ color: 'var(--slate)', fontSize: 13 }}>
                  /mo{billing !== 'monthly' ? ' equiv.' : ''}
                </span>
              </div>
              <div className="note" style={{ marginTop: 8, lineHeight: 1.6 }}>
                {BILLING[billing].label} · 6-month initial term
              </div>
              <div className="note" style={{ marginTop: 12, lineHeight: 1.6 }}>
                {plan.audience}
              </div>
              <p className="note" style={{ marginTop: 18, lineHeight: 1.6 }}>
                You can change the billing option on the next step. Full pricing and terms are on the{' '}
                <Link href={`/pricing#${plan.anchor}`} style={{ color: 'var(--green)' }}>
                  pricing page
                </Link>
                . Prefer to talk first?{' '}
                <Link href="/strategy-call" style={{ color: 'var(--amber)' }}>
                  Book a strategy call
                </Link>{' '}
                or call{' '}
                <a href={siteConfig.phone.href} style={{ color: 'var(--amber)' }}>
                  {siteConfig.phone.display}
                </a>
                .
              </p>
            </div>
          </div>

          <div>
            <QualifierForm
              plan={plan.key as 'essential' | 'growth-engine'}
              billing={billing}
              turnstileSiteKey={turnstile.siteKey}
            />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
