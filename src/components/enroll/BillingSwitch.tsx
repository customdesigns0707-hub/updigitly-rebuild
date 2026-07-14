'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BILLING, type BillingKey } from '@/lib/plans';

/**
 * Lets the visitor switch billing option on the review page BEFORE accepting.
 * POSTs the change (server is authoritative), then refreshes so the loud money
 * figures are recomputed server-side. Locked once the disclosure is accepted.
 */
export function BillingSwitch({
  secureId,
  current,
  disabled,
}: {
  secureId: string;
  current: BillingKey;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState<BillingKey | null>(null);

  async function choose(key: BillingKey) {
    if (key === current || disabled) return;
    setSaving(key);
    try {
      const res = await fetch(`/api/enroll/${secureId}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing: key }),
      });
      if (res.ok) startTransition(() => router.refresh());
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="bill-switch" role="group" aria-label="Billing option">
      {(Object.keys(BILLING) as BillingKey[]).map((k) => (
        <button
          key={k}
          type="button"
          className={k === current ? 'on' : ''}
          disabled={disabled || pending || saving !== null}
          onClick={() => choose(k)}
          data-hover
        >
          {saving === k ? '…' : BILLING[k].short}
          {BILLING[k].discount > 0 ? ` −${Math.round(BILLING[k].discount * 100)}%` : ''}
        </button>
      ))}
    </div>
  );
}
