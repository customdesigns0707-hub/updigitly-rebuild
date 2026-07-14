'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * The acceptance control. The visitor must actively check the box (the
 * commitment is never a buried default — Decision #4) before the accept button
 * enables. On success the page refreshes into its accepted state, where the
 * Chat-3 checkout step is attached. No payment happens here.
 */
export function AcceptPanel({ secureId }: { secureId: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enroll/${secureId}/accept`, { method: 'POST' });
      if (res.ok) {
        startTransition(() => router.refresh());
        return;
      }
      if (res.status === 404) setError('This enrollment could not be found. Please start again from Pricing.');
      else setError('We couldn’t record your acceptance. Please try again.');
      setSubmitting(false);
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="accept-box">
      <label className="accept-check" data-hover>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>
          I&rsquo;ve reviewed the plan, billing option, the charge today, the recurring charge, the 6-month
          initial term and minimum obligation, and the renewal behavior above, and I agree to the{' '}
          <Link href="/legal" style={{ color: 'var(--green)' }}>
            terms
          </Link>
          .
        </span>
      </label>

      {error && (
        <p className="q-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn-primary"
        data-hover
        disabled={!checked || submitting || pending}
        onClick={accept}
      >
        {submitting || pending ? 'Recording…' : 'Agree & continue →'}
      </button>
      <p className="q-fine">
        Accepting records your agreement to these terms. The secure payment step comes after this — you are not
        charged by continuing here.
      </p>
    </div>
  );
}
