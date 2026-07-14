/**
 * Cloudflare Turnstile server-side verification. Server-only.
 *
 * When no secret is configured (local dev / not yet wired) verification is
 * SKIPPED and returns ok:true so the forms still work — the widget also hides
 * itself client-side, so the two stay consistent. In production, set both
 * TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY to enforce it.
 */
import 'server-only';
import { turnstile } from './env';

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
  if (!turnstile.isConfigured) return { ok: true, skipped: true };
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
