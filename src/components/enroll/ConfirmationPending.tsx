'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Shown on the confirmation page while the Stripe webhook is confirming payment.
 * The success redirect is NOT proof — this polls the server (which reflects the
 * webhook-confirmed state) and refreshes into the confirmed view once paid.
 */
export function ConfirmationPending({ secureId }: { secureId: string }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();

    const tick = async () => {
      try {
        const res = await fetch(`/api/enroll/${secureId}/status`, { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as { paid?: boolean };
        if (!stopped && data.paid) {
          router.refresh();
          return;
        }
      } catch {
        /* transient — keep polling */
      }
      if (!stopped) {
        if (Date.now() - started > 20_000) setSlow(true);
        window.setTimeout(tick, 2500);
      }
    };

    const id = window.setTimeout(tick, 1500);
    return () => {
      stopped = true;
      window.clearTimeout(id);
    };
  }, [secureId, router]);

  return (
    <>
      <div className="kicker">{'//'} Enrollment</div>
      <h1 style={{ fontSize: 'clamp(32px,4.6vw,54px)' }}>
        Confirming your <span className="dim">enrollment…</span>
      </h1>
      <p className="sub">
        We’re verifying your payment securely. This usually takes only a few seconds — the page
        updates itself, so there’s no need to refresh.
      </p>
      <div style={{ marginTop: 24 }}>
        <span className="accepted-flag">
          <span className="pulse" style={{ background: 'var(--amber)' }} />
          Verifying payment
        </span>
      </div>
      {slow && (
        <p className="q-fine" style={{ marginTop: 20 }}>
          Still confirming. Your payment is safe either way — if this doesn’t update within a minute,
          reach us and we’ll confirm it for you.
        </p>
      )}
    </>
  );
}
