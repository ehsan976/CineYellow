import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { payment } from "@/db/schema";
import { verifySafepayWebhook } from "@/lib/payments/safepay";
import { syncPaymentWithGateway } from "@/lib/payments/service";

/**
 * Safepay webhooks (Dashboard → Developers → Endpoints → this URL). The X-SFPY-SIGNATURE must
 * match; then the tracker's state is fetched from Safepay itself, so a payment is applied the same
 * way as on the browser return, and only once.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySafepayWebhook(raw, request.headers.get("x-sfpy-signature") ?? "")) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { type?: string; data?: { tracker?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Any verified event about one of our trackers (succeeded, failed, refunded, reversed…): the
  // real state is fetched from Safepay itself, so the event type only decides whether to look.
  const tracker = event.data?.tracker;
  if (tracker) {
    const [row] = await db.select().from(payment).where(eq(payment.providerTxnId, tracker)).limit(1);
    if (row) {
      try {
        await syncPaymentWithGateway(row, { checkRefunds: true });
      } catch (error) {
        // Still acknowledge; the browser return or "Check status" will pick it up.
        console.error("Safepay webhook: status check failed", error);
      }
    }
  }
  // Acknowledge every verified event (including types we don't use) so Safepay stops retrying.
  return NextResponse.json({ received: true });
}
