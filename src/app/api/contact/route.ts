/**
 * POST /api/contact — native message form (Decision #4).
 * Turnstile → Zod validate → PERSIST to Postgres → best-effort GHL sync (a new
 * note per submission). A GHL outage leaves the message saved for the cron.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { contactSubmitSchema } from '@/lib/enrollment';
import { verifyTurnstile } from '@/lib/turnstile';
import { insertContactMessage } from '@/lib/repo';
import { syncContactMessage } from '@/lib/ghl/sync';
import { clientIp, userAgent } from '@/lib/request';
import { dbConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = contactSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', issues: parsed.error.flatten() }, { status: 422 });
  }
  const data = parsed.data;

  const ip = clientIp(req);
  const bot = await verifyTurnstile(data.turnstileToken, ip);
  if (!bot.ok) return NextResponse.json({ error: 'turnstile', reason: bot.reason }, { status: 400 });

  if (!dbConfigured) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let message;
  try {
    message = await insertContactMessage({
      name: data.name,
      business: data.business,
      email: data.email,
      phone: data.phone,
      purpose: data.purpose,
      message: data.message,
      ip,
      userAgent: userAgent(req),
    });
  } catch (err) {
    console.error('[contact] persist failed', err);
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }

  try {
    await syncContactMessage(message.id);
  } catch (err) {
    console.error('[contact] GHL sync deferred (will retry via cron):', err);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
