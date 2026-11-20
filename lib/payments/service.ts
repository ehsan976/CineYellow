// Payment rows and access periods. Server only. Gateways never decide the amount or the plan:
// both are stored here when the payment starts, and every result is matched against that row.
import type { PaymentProvider, PlanId } from "@/lib/types";
import type { GatewayResult } from "@/lib/payments/zurvapay";
import { inquireZurvapay } from "@/lib/payments/zurvapay";
import { randomInt } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { payment } from "@/db/schema";
import { PLAN_DAYS } from "@/lib/payments/config";
import { PLAN_PRICES_PKR } from "@/lib/user-data";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 20-character order reference: "T" + milliseconds + 6 random digits (unique, gateway-safe). */
export function newPaymentRef() {
  return `T${Date.now()}${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

export async function createPayment({
  userId,
  plan,
  provider,
}: {
  userId: string;
  plan: PlanId;
  provider: PaymentProvider;
}) {
  const [row] = await db
    .insert(payment)
    // `method` (card, bank…) is filled in from the gateway's answer.
    .values({ id: newPaymentRef(), userId, plan, provider, method: "", amount: PLAN_PRICES_PKR[plan] })
    .returning();
  return row;
}

/**
 * Record the gateway's answer for a pending payment. "paid" also sets the access period: paying
 * for the same plan again adds PLAN_DAYS after the current end; another plan starts now.
 * Only a row that is still pending changes, so a repeated callback can't add time twice.
 * Returns the row's status afterwards.
 */
export async function applyGatewayResult(paymentId: string, result: GatewayResult) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(payment).where(eq(payment.id, paymentId)).for("update").limit(1);
    if (!row) return null;
    if (row.status !== "pending" || result.status === "pending") {
      if (result.status === "pending" && row.status === "pending") {
        await tx.update(payment).set({ responseCode: result.code, responseMessage: result.message }).where(eq(payment.id, row.id));
      }
      return row.status;
    }

    if (result.status === "failed") {
      await tx
        .update(payment)
        .set({ status: "failed", method: result.method ?? row.method, responseCode: result.code, responseMessage: result.message })
        .where(eq(payment.id, row.id));
      return "failed";
    }

    const now = new Date();
    let start = now;
    if (row.userId) {
      const [current] = await tx
        .select()
        .from(payment)
        .where(and(eq(payment.userId, row.userId), eq(payment.status, "paid"), gt(payment.periodEnd, now)))
        .orderBy(desc(payment.periodEnd))
        .limit(1);
      if (current && current.plan === row.plan && current.periodEnd) start = current.periodEnd;
    }
    await tx
      .update(payment)
      .set({
        status: "paid",
        paidAt: now,
        periodStart: start,
        periodEnd: new Date(start.getTime() + PLAN_DAYS * DAY_MS),
        providerTxnId: result.txnId ?? row.providerTxnId,
        method: result.method ?? row.method,
        responseCode: result.code,
        responseMessage: result.message,
      })
      .where(eq(payment.id, row.id));
    return "paid";
  });
}

/** Remember the gateway's reference for a payment (ZurvaPay's transaction id). */
export async function setPaymentReference(paymentId: string, providerTxnId: string) {
  await db.update(payment).set({ providerTxnId }).where(eq(payment.id, paymentId));
}

/**
 * Ask ZurvaPay about a payment row (by our id, which is ZurvaPay's `identifier`) and record the
 * answer. Returns the status afterwards. Old Safepay rows are left as they are.
 */
export async function syncPaymentWithGateway(row: typeof payment.$inferSelect) {
  if (row.status !== "pending" || row.provider !== "zurvapay") return row.status;
  const result = await inquireZurvapay(row.id, row.amount);
  return applyGatewayResult(row.id, result);
}

/**
 * One of the user's payments, re-checked with ZurvaPay if it's still pending (the browser may have
 * closed before returning, or the IPN is late). Returns the status afterwards.
 */
export async function recheckPayment(userId: string, paymentId: string) {
  const [row] = await db
    .select()
    .from(payment)
    .where(and(eq(payment.id, paymentId), eq(payment.userId, userId)))
    .limit(1);
  if (!row) return null;
  return syncPaymentWithGateway(row);
}
