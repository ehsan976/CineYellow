import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { payment } from "@/db/schema";
import { paidResult, verifyZurvapaySignatures } from "@/lib/payments/zurvapay";
import { applyGatewayResult } from "@/lib/payments/service";

/**
 * ZurvaPay IPN: a form POST sent only for PAID payments (to the ipn_url given at initiate, which
 * is only sent for a public https site). Both signatures must match over the raw amount string;
 * the amount is checked against our row and the row is marked paid only once (applyGatewayResult
 * changes pending rows only). Always answer HTTP 200, or ZurvaPay retries up to 10 times.
 */
export async function POST(request: Request) {
  const ok = () => NextResponse.json({ status: "ok" });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ status: "failed" });
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };

  const status = field("status");
  const identifier = field("identifier");
  const amount = field("data[amount]"); // e.g. "500.00000000" — used exactly as received
  const signed = verifyZurvapaySignatures({
    status,
    identifier,
    amount,
    signature: field("signature"),
    statusSignature: field("status_signature"),
  });
  if (!signed || status !== "success") {
    console.error(`ZurvaPay IPN: rejected (signature ${signed ? "ok" : "invalid"}, status "${status}") for "${identifier}"`);
    return NextResponse.json({ status: "failed" });
  }

  const [row] = await db.select().from(payment).where(eq(payment.id, identifier)).limit(1);
  if (!row || row.provider !== "zurvapay") {
    console.error(`ZurvaPay IPN: no payment "${identifier}"`);
    return ok();
  }

  try {
    const result = paidResult(
      {
        amount,
        currency: field("data[currency][code]"),
        trx: field("data[payment_trx]") || undefined,
        method: field("data[payment_method]"),
      },
      row.amount
    );
    await applyGatewayResult(row.id, result);
  } catch (error) {
    // Still acknowledge; "Check status" or the return page will pick it up from the status API.
    console.error("ZurvaPay IPN: couldn't record the payment", error);
  }
  return ok();
}
