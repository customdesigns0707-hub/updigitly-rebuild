'use client';
import { useState } from 'react';

/**
 * Launches Stripe-hosted checkout. Posts to the server, which creates the
 * Checkout Session (server owns the price — the browser never sends one) and
 * returns the hosted URL. No card data ever touches Updigitly's stack.
 */
export function CheckoutButton({ secureId }: { secureId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/enroll/${secureId}/checkout`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(
        data.error === 'price_unavailable' || data.error === 'stripe_not_configured'
          ? 'Secure checkout isn’t available for a moment. Please try again shortly, or call us and we’ll help.'
          : 'We couldn’t open secure checkout. Please try again.',
      );
      setLoading(false);
    } catch {
      setError('Network error — please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="checkout-launch">
      <button type="button" className="btn-primary" data-hover disabled={loading} onClick={go}>
        {loading ? 'Opening secure checkout…' : 'Continue to secure payment →'}
      </button>
      {error && (
        <p className="q-error" role="alert">
          {error}
        </p>
      )}
      <p className="q-fine">
        Payment is processed securely by Stripe. No card details are handled on Updigitly’s own systems.
      </p>
    </div>
  );
}
