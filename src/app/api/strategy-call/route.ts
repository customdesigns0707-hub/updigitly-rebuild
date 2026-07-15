/**
 * POST /api/strategy-call — pre-booking qualifier for /strategy-call, picked
 * up from the Chat 4 placeholder. Turnstile → Zod validate → PERSIST to
 * Postgres → best-effort GHL sync (a new note per submission). Modeled
 * directly on /api/contact: standalone record, no state machine, no gating —
 * never blocks the calendar hand-off (Decision #3).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { strategyCallSubmitSchema } from '@/lib/strategyCall';
import { verifyTurnstile } from '@/lib/turnstile';
import { insertStrategyCallInquiry } from '@/lib/repo';
import { syncStrategyCallInquiry } from '@/lib/ghl/sync';
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

  const parsed = strategyCallSubmitSchema.safeParse(body);
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

  let inquiry;
  try {
    inquiry = await insertStrategyCallInquiry({
      contactName: data.contactName,
      businessName: data.businessName,
      email: data.email,
      phone: data.phone,
      answers: data.answers,
      goal: data.goal,
      anythingElse: data.anythingElse,
      ip,
      userAgent: userAgent(req),
    });
  } catch (err) {
    console.error('[strategy-call] persist failed', err);
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }

  try {
    await syncStrategyCallInquiry(inquiry.id);
  } catch (err) {
    console.error('[strategy-call] GHL sync deferred (will retry via cron):', err);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
