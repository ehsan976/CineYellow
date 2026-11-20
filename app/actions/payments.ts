"use server";

// Starting and checking ZurvaPay payments. The plan's price always comes from PLAN_PRICES_PKR on
// the server (and is checked again against ZurvaPay's signed answer); the browser only picks the plan.
import type { PlanId } from "@/lib/types";

import { UnauthorizedError, requireUser } from "@/lib/server/dal";
import { PLAN_DAYS, zurvapay } from "@/lib/payments/config";
import { createZurvapayCheckout } from "@/lib/payments/zurvapay";
import { createPayment, recheckPayment, setPaymentReference } from "@/lib/payments/service";
import { isPlanId } from "@/lib/user-data";

type Failure = { ok: false; error: string };

const PLAN_NAMES: Record<PlanId, string> = { basic: "Basic", standard: "Standard", premium: "Premium" };

function failure(error: unknown): Failure {
  if (error instanceof UnauthorizedError) return { ok: false, error: "Your session has ended. Please sign in again." };
  console.error(error);
  return { ok: false, error: "Couldn't reach ZurvaPay. Please try again in a moment." };
}

/** Creates the payment and returns ZurvaPay's hosted checkout URL to send the browser to. */
export async function startCheckout(plan: PlanId): Promise<{ ok: true; url: string } | Failure> {
  try {
    if (!zurvapay.enabled) return { ok: false, error: "Payments aren't set up yet." };
    if (!isPlanId(plan)) return { ok: false, error: "Invalid plan." };
    const user = await requireUser();
    const row = await createPayment({ userId: user.id, plan, provider: "zurvapay" });
    const { url, trx } = await createZurvapayCheckout({
      ref: row.id,
      amount: row.amount,
      details: `CineYellow ${PLAN_NAMES[plan]} plan, ${PLAN_DAYS} days`,
      customerName: user.name,
      customerEmail: user.email,
    });
    if (trx) await setPaymentReference(row.id, trx);
    return { ok: true, url };
  } catch (error) {
    return failure(error);
  }
}

/** Re-check a pending payment with ZurvaPay. */
export async function checkPaymentStatus(paymentId: string): Promise<{ ok: true; status: string } | Failure> {
  try {
    const user = await requireUser();
    const status = await recheckPayment(user.id, String(paymentId ?? ""));
    if (!status) return { ok: false, error: "Payment not found." };
    return { ok: true, status };
  } catch (error) {
    return failure(error);
  }
}
