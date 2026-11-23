import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { payment } from "@/db/schema";
import { siteUrl } from "@/lib/payments/config";
import { syncPaymentWithGateway } from "@/lib/payments/service";

/**
 * Safepay sends the shopper back here (redirect_url) with ?ref=<our payment id>&tracker=… .
 * Nothing in the URL is trusted: we ask Safepay for the tracker's state before giving access.
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  // Safepay appends its own "?tracker=…" to our redirect_url, which already has "?ref=…", so the
  // ref can arrive as "T123?tracker=track_…". Keep only our id (a "T" and digits).
  const ref = (url.searchParams.get("ref") ?? "").match(/^T\d+/)?.[0] ?? "";
  let tracker = url.searchParams.get("tracker") ?? "";
  if (!tracker) {
    const glued = (url.searchParams.get("ref") ?? "").match(/[?&]tracker=([^&]+)/);
    if (glued) tracker = decodeURIComponent(glued[1]);
  }
  if (!tracker && request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const value = form?.get("tracker");
    if (typeof value === "string") tracker = value;
  }
  console.log(`Safepay return: ${request.method} ${url.pathname}${url.search}`);

  const back = (outcome: "success" | "pending" | "failed") =>
    NextResponse.redirect(`${siteUrl}/account?payment=${outcome}`, 303);

  // Find our payment by its id, or else by Safepay's tracker (stored when the payment started).
  const [row] = ref
    ? await db.select().from(payment).where(eq(payment.id, ref)).limit(1)
    : tracker
      ? await db.select().from(payment).where(eq(payment.providerTxnId, tracker)).limit(1)
      : [];
  if (!row || row.provider !== "safepay") {
    console.error(`Safepay return: no payment for ref="${ref}" tracker="${tracker}"`);
    return back("failed");
  }
  if (tracker && row.providerTxnId && tracker !== row.providerTxnId) {
    console.error(`Safepay return: tracker "${tracker}" doesn't match payment ${row.id}`);
    return back("failed");
  }

  try {
    const status = await syncPaymentWithGateway(row);
    return back(status === "paid" ? "success" : status === "failed" ? "failed" : "pending");
  } catch (error) {
    console.error("Safepay return: status check failed", error);
    return back("pending");
  }
}

export const GET = handle;
export const POST = handle;
