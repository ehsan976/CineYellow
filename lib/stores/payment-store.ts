// Safepay actions for the account page.
import type { PlanId } from "@/lib/types";
import { checkPaymentStatus, startSafepayCheckout } from "@/app/actions/payments";
import { getUserDataState, loadUserData } from "@/lib/stores/user-data-store";

export type PayResult = { ok: boolean; error?: string; status?: string };

const offline = { ok: false, error: "Can't reach the server. Check your connection and try again." };

/** Leaves the site for Safepay's checkout page; Safepay sends the viewer back to /account. */
export async function payWithSafepay(plan: PlanId): Promise<PayResult> {
  try {
    const result = await startSafepayCheckout(plan);
    if (!result.ok) return result;
    window.location.assign(result.url);
    return { ok: true };
  } catch {
    return offline;
  }
}

/** Re-check a payment that wasn't confirmed yet, then reload the account data. */
export async function checkPendingPayment(paymentId: string): Promise<PayResult> {
  try {
    const result = await checkPaymentStatus(paymentId);
    const { userId } = getUserDataState();
    if (result.ok && userId) await loadUserData(userId, { force: true });
    return result;
  } catch {
    return offline;
  }
}
