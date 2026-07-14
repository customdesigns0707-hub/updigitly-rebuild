/**
 * POST /api/enroll/[id]/accept — record commitment-disclosure acceptance.
 *
 * The price snapshot is rebuilt SERVER-SIDE from the enrollment's stored plan +
 * billing (client numbers are never trusted), frozen as immutable evidence with
 * IP + user-agent + timestamp, and the stage advances via compare-and-set so a
 * double-submit is safe (Decision #4). Best-effort GHL sync follows. No payment.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getEnrollmentBySecureId, recordDisclosureAcceptance } from '@/lib/repo';
import { buildPriceSnapshot, DISCLOSURE_VERSION, FAIR_RESOLUTION_SENTENCE } from '@/lib/enrollment';
import { syncEnrollment } from '@/lib/ghl/sync';
import { clientIp, userAgent } from '@/lib/request';
import { usd } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const enrollment = await getEnrollmentBySecureId(params.id);
  if (!enrollment) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Authoritative snapshot from stored state — not from the client.
  const snapshot = buildPriceSnapshot(enrollment.planKey, enrollment.billingKey);

  const acceptanceText = [
    `Accepted the ${snapshot.planName} commitment disclosure (${DISCLOSURE_VERSION}).`,
    `Billing: ${snapshot.billingLabel}. Charged today: ${usd(snapshot.immediateCharge)}.`,
    `Recurring: ${snapshot.recurringText}`,
    `Initial term: ${snapshot.initialTermMonths} months. Minimum obligation: ${usd(snapshot.minCommitment)}.`,
    `Renewal: ${snapshot.renewalBehavior}`,
    `Fair resolution: ${FAIR_RESOLUTION_SENTENCE}`,
  ].join('\n');

  const result = await recordDisclosureAcceptance({
    secureId: enrollment.secureId,
    disclosureVersion: DISCLOSURE_VERSION,
    priceSnapshot: snapshot,
    acceptanceText,
    ip: clientIp(req),
    userAgent: userAgent(req),
    eventPayload: {
      version: DISCLOSURE_VERSION,
      plan: snapshot.planName,
      billing: snapshot.billingLabel,
      immediateCharge: snapshot.immediateCharge,
      minCommitment: snapshot.minCommitment,
    },
  });

  if (!result.ok) {
    const status = result.reason === 'not_found' ? 404 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }

  // Best-effort CRM sync — never fails the acceptance (canonical record is saved).
  try {
    await syncEnrollment(result.enrollment.id);
  } catch (err) {
    console.error('[accept] GHL sync deferred (will retry via cron):', err);
  }

  return NextResponse.json({ ok: true, alreadyAccepted: result.alreadyAccepted });
}
