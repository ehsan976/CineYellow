import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { payment } from "@/db/schema";
import { siteUrl } from "@/lib/payments/config";
import { syncPaymentWithGateway } from "@/lib/payments/service";

/**
 * ZurvaPay sends the customer back here (success_url, or cancel_url with &cancelled=1) with
 * ?ref=<our payment id>. These are plain browser redirects that anyone can open, so nothing here is
 * trusted: the result comes from ZurvaPay's signed status API before any access is given.
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  // Keep only our id ("T" + digits) in case ZurvaPay appends its own "?…" to the URL.
  const ref = (url.searchParams.get("ref") ?? "").match(/^T\d+/)?.[0] ?? "";
  const cancelled = url.searchParams.has("cancelled") || (url.searchParams.get("ref") ?? "").includes("cancelled");
  console.log(`ZurvaPay return: ${request.method} ${url.pathname}${url.search}`);

  const back = (outcome: "success" | "pending" | "failed" | "cancelled") =>
    NextResponse.redirect(`${siteUrl}/account?payment=${outcome}`, 303);

  const [row] = ref ? await db.select().from(payment).where(eq(payment.id, ref)).limit(1) : [];
  if (!row || row.provider !== "zurvapay") {
    console.error(`ZurvaPay return: no payment for ref="${ref}"`);
    return back(cancelled ? "cancelled" : "failed");
  }

  try {
    // Even after "cancel" the customer may have paid on their phone, so always ask ZurvaPay.
    const status = await syncPaymentWithGateway(row);
    if (status === "paid") return back("success");
    if (cancelled) return back("cancelled");
    return back(status === "failed" ? "failed" : "pending");
  } catch (error) {
    console.error("ZurvaPay return: status check failed", error);
    return back(cancelled ? "cancelled" : "pending");
  }
}

export const GET = handle;
export const POST = handle;
