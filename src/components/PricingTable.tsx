'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  PLANS,
  BILLING,
  type BillingKey,
  priceFor,
  usd,
  GROWTH_SCOPE_NOTE,
} from '@/lib/plans';

/**
 * Pricing presentation (Chat 1) — billing selector + three plan cards, all
 * numbers derived from lib/plans.ts. The 6-month initial term is shown LOUD on
 * every priced card (Decision #2). CTAs ROUTE ONLY — this page does not host
 * the enrollment transaction (Decision #3). Essential/Growth → /enroll/[key]
 * (built in Chat 2); Scale → /strategy-call.
 */
export function PricingTable() {
  const [billing, setBilling] = useState<BillingKey>('monthly');

  return (
    <>
      <div className="toggle-wrap">
        <div className="toggle" role="tablist" aria-label="Billing option">
          {(Object.keys(BILLING) as BillingKey[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={billing === k}
              className={billing === k ? 'on' : ''}
              onClick={() => setBilling(k)}
            >
              {BILLING[k].short}
              {BILLING[k].discount > 0 && (
                <span className="save">SAVE {Math.round(BILLING[k].discount * 100)}%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="plans">
        {PLANS.map((plan) => {
          const isCustom = plan.base === null;
          const p = !isCustom ? priceFor(plan.base as number, billing) : null;
          const href =
            plan.cta.kind === 'book' ? '/strategy-call' : `/enroll/${plan.key}?billing=${billing}`;
          return (
            <div key={plan.key} id={plan.anchor} className={`plan${plan.recommended ? ' hot' : ''}`}>
              {plan.recommended && <div className="badge">RECOMMENDED FOR GROWTH</div>}
              <div className="tname">{plan.name}</div>
              <div className="tdesc">{plan.audience}</div>

              <div className="price">
                {isCustom ? (
                  <>
                    <div className="big">Custom</div>
                    <div className="term-line">
                      Strategy-call enrollment only
                      <br />
                      Scoped to your organization
                    </div>
                  </>
                ) : (
                  <>
                    <div className="big">
                      {usd(p!.effectiveMonthly, true)}
                      <small>/mo{billing !== 'monthly' ? ' equiv.' : ''}</small>
                    </div>
                    <div className="term-line">
                      {billing === 'monthly' ? (
                        <>Billed monthly</>
                      ) : (
                        <>
                          Pay {usd(p!.chargedNow)} today · covers {p!.coversMonths} months
                          <br />
                          <span className="sv">Save {usd(p!.savings)}</span>
                        </>
                      )}
                      <br />
                      <b style={{ color: 'var(--white)', fontWeight: 500 }}>6-month initial term</b>
                    </div>
                  </>
                )}
              </div>

              <ul>
                {plan.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>

              {plan.recommended && (
                <p
                  className="note"
                  style={{ marginTop: 18, lineHeight: 1.6, fontSize: '12px' }}
                >
                  {GROWTH_SCOPE_NOTE}
                </p>
              )}

              <Link
                href={href}
                className={`cta ${plan.recommended ? 'solid' : plan.cta.kind === 'book' ? 'amber' : 'outline'}`}
                data-hover
              >
                {plan.cta.label}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
