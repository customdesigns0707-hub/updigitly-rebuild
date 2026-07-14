/**
 * Small request helpers for the API routes. Server-only.
 */
import 'server-only';
import type { NextRequest } from 'next/server';

/** Best-effort client IP for acceptance evidence + Turnstile remoteip. */
export function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? null;
}

export function userAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent');
}
