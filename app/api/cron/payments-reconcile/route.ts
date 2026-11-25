import { authorizeCron, runCronJob } from "@/lib/server/cron";
import { billingEnabled } from "@/lib/payments/config";
import { reconcilePendingPayments } from "@/lib/payments/service";

export const maxDuration = 60;

/** GET /api/cron/payments-reconcile — re-checks Safepay payments stuck in "pending". */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  return runCronJob("payments-reconcile", async () => (billingEnabled ? reconcilePendingPayments() : { skipped: "payments are off" }));
}
