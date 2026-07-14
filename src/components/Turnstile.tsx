'use client';
import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget (client). Renders the challenge and reports the
 * token up via `onToken`. When no site key is configured it renders nothing and
 * immediately reports an empty token, so forms still submit in dev — the server
 * verifier is skipped in lockstep (see lib/turnstile.ts).
 *
 * Token freshness: Turnstile tokens are single-use and expire ~5 min after the
 * challenge solves. If a submit fails and the visitor retries, reusing that
 * token makes Cloudflare answer `timeout-or-duplicate`. Two guards prevent it:
 *   1. `refresh-expired: 'auto'` + `retry: 'auto'` — the widget silently issues
 *      a new token when one expires or a challenge errors.
 *   2. `resetSignal` — the parent bumps this after any failed submit; we reset
 *      the widget so the next attempt carries a brand-new token.
 *
 * Signal-styled: the widget uses Cloudflare's dark theme to sit on --surface.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    __updigitlyTurnstileLoading?: boolean;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      // If already loaded but window.turnstile not yet ready, poll briefly.
      const poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          resolve();
        }
      }, 60);
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.addEventListener('load', () => resolve(), { once: true });
    document.head.appendChild(s);
  });
}

export function Turnstile({
  siteKey,
  onToken,
  resetSignal = 0,
}: {
  siteKey?: string;
  onToken: (token: string) => void;
  /** Increment to force a fresh token (e.g. after a failed submit). */
  resetSignal?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) {
      onToken(''); // no challenge configured — let the (skipped) server verify pass
      return;
    }
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: 'dark',
        // Silently mint a fresh token when one expires or a challenge errors,
        // so a token is never stale by the time the visitor submits.
        'refresh-expired': 'auto',
        retry: 'auto',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* noop */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  // Reset on demand: clears the spent/expired token and runs a fresh challenge,
  // whose callback delivers a new token. Skips the very first render (signal 0).
  useEffect(() => {
    if (!siteKey || !resetSignal) return;
    onToken(''); // drop the old token immediately so a retry can't reuse it
    if (widgetId.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetId.current);
      } catch {
        /* noop */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  if (!siteKey) return null;
  return <div ref={ref} className="turnstile-mount" style={{ marginTop: 18 }} />;
}
