/**
 * Cloudflare Turnstile server-side verification. Server-only.
 *
 * When no secret is configured, behavior depends on environment: in local dev
 * verification is SKIPPED and returns ok:true so the forms still work without
 * credentials — the widget also hides itself client-side, so the two stay
 * consistent. In production, a missing secret instead FAILS CLOSED
 * (ok:false, reason:'not-configured') so bot protection can never silently
 * disappear because an env var went missing. Set both TURNSTILE_SECRET_KEY
 * and NEXT_PUBLIC_TURNSTILE_SITE_KEY to enforce it normally.
 */
import 'server-only';
import { turnstile, isDev } from './env';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
}

export async function verifyTurnstile(
  token: string | undefined,
  ip: string | null,
): Promise<TurnstileResult> {
  if (!turnstile.isConfigured) {
    if (isDev) return { ok: true, skipped: true };
    return { ok: false, reason: 'not-configured' };
  }
  if (!token) return { ok: false, reason: 'missing-token' };

  const body = new URLSearchParams();
  body.set('secret', turnstile.secretKey as string);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body });
    const data = (await res.json()) as { success: boolean; ['error-codes']?: string[] };
    return { ok: !!data.success, reason: data['error-codes']?.join(',') };
  } catch (err) {
    return { ok: false, reason: `verify-failed:${String(err)}` };
  }
}
