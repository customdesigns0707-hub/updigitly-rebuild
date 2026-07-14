/**
 * POST /api/enroll/[id]/billing — change the billing option before acceptance.
 * Compare-and-set in the repo blocks the change once the disclosure is accepted
 * (the evidence is frozen), so the money the visitor attested to can't shift.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { updateBilling } from '@/lib/repo';
import { BILLING, type BillingKey } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { billing?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const billing = body.billing;
  if (!billing || !(billing in BILLING)) {
    return NextResponse.json({ error: 'invalid_billing' }, { status: 422 });
  }

  const updated = await updateBilling(params.id, billing as BillingKey);
  if (!updated) {
    // Either not found, or already past qualifier_submitted (locked).
    return NextResponse.json({ error: 'locked_or_not_found' }, { status: 409 });
  }
  return NextResponse.json({ ok: true, billing: updated.billingKey });
}
