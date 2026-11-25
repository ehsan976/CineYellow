"use server";

// Starting and checking Safepay payments. The plan's price always comes from PLAN_PRICES_PKR on
// the server (and is checked again against Safepay's tracker); the browser only picks the plan.
import type { PlanId } from "@/lib/types";

import { UnauthorizedError, requireUser } from "@/lib/server/dal";
import { safepay } from "@/lib/payments/config";
import { createSafepayCheckout } from "@/lib/payments/safepay";
import { createPayment, isCheckoutPaused, recheckPayment, setPaymentReference } from "@/lib/payments/service";
import { isPlanId } from "@/lib/user-data";
import { hitLimit } from "@/lib/server/rate-limit";

type Failure = { ok: false; error: string };

function failure(error: unknown): Failure {
  if (error instanceof UnauthorizedError) return { ok: false, error: "Your session has ended. Please sign in again." };
  console.error(error);
  return { ok: false, error: "Couldn't reach Safepay. Please try again in a moment." };
}

/** Creates the payment and returns Safepay's hosted checkout URL to send the browser to. */
export async function startSafepayCheckout(plan: PlanId): Promise<{ ok: true; url: string } | Failure> {
  try {
    if (!safepay.enabled) return { ok: false, error: "Payments aren't set up yet." };
    if (!isPlanId(plan)) return { ok: false, error: "Invalid plan." };
    const user = await requireUser();
    if (await isCheckoutPaused()) {
      return { ok: false, error: "Plans open as soon as the first movies and shows are streaming on CineYellow. No payment was taken." };
    }
    // Each attempt creates a payment row and calls Safepay twice: cap it per user.
    const { ok, retryAfter } = hitLimit(user.id, "checkout");
    if (!ok) return { ok: false, error: `Too many payment attempts. Try again in ${Math.ceil(retryAfter / 60)} min.` };
    const row = await createPayment({ userId: user.id, plan, provider: "safepay" });
    const { tracker, url } = await createSafepayCheckout({ ref: row.id, amount: row.amount });
    await setPaymentReference(row.id, tracker);
    return { ok: true, url };
  } catch (error) {
    return failure(error);
  }
}

/** Re-check a pending payment with Safepay. */
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
