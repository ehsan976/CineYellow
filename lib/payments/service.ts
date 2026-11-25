// Payment rows and access periods. Server only. Gateways never decide the amount or the plan:
// both are stored here when the payment starts, and every result is matched against that row.
import "server-only";
import type { PaymentProvider, PlanId } from "@/lib/types";
import type { GatewayResult } from "@/lib/payments/safepay";
import { inquireSafepay } from "@/lib/payments/safepay";
import { randomInt } from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db";
import { payment } from "@/db/schema";
import { PLAN_DAYS } from "@/lib/payments/config";
import { PLAN_PRICES_PKR } from "@/lib/user-data";
import { getAvailableTitleIds } from "@/lib/server/video-sources";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * New payments are paused while the site has no licensed video at all: paying would only unlock
 * "Not on CineYellow yet" screens. It reopens by itself when the first video is added in
 * /admin/videos (getAvailableTitleIds is refreshed on every admin save). Paid access already
 * bought is untouched. Only matters with Safepay on (billingEnabled).
 */
export async function isCheckoutPaused(): Promise<boolean> {
  return (await getAvailableTitleIds()).length === 0;
}

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
      // Two of this user's payments confirmed at the same moment would both read the same current
      // period and overlap (losing the customer a month). Serialise per user for this transaction.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`payment:${row.userId}`}))`);
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
        providerTxnId: result.txnId ?? null,
        method: result.method ?? row.method,
        responseCode: result.code,
        responseMessage: result.message,
      })
      .where(eq(payment.id, row.id));
    return "paid";
  });
}

/** Remember the gateway's reference for a payment (Safepay's tracker token). */
export async function setPaymentReference(paymentId: string, providerTxnId: string) {
  await db.update(payment).set({ providerTxnId }).where(eq(payment.id, paymentId));
}

/** Safepay states that take back money already paid: access from that payment must end. */
const TAKEN_BACK = new Set(["TRACKER_REFUNDED", "TRACKER_REVERSED"]);

/**
 * A paid payment was refunded or reversed: mark it "refunded" and end its access now (or leave
 * the end alone if it's already in the past). Returns the status afterwards.
 */
async function revokePaidPayment(paymentId: string, code: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(payment).where(eq(payment.id, paymentId)).for("update").limit(1);
    if (!row || row.status !== "paid") return row?.status ?? null;
    const now = new Date();
    await tx
      .update(payment)
      .set({
        status: "refunded",
        responseCode: code,
        periodEnd: row.periodEnd && row.periodEnd > now ? now : row.periodEnd,
      })
      .where(eq(payment.id, row.id));
    return "refunded";
  });
}

/**
 * Ask Safepay about a payment row and record the answer. Returns the status afterwards.
 * Pending rows get their result; with `checkRefunds` (webhooks), paid rows are checked for a
 * refund or reversal, which ends the access they gave.
 */
export async function syncPaymentWithGateway(row: typeof payment.$inferSelect, { checkRefunds = false } = {}) {
  if (!row.providerTxnId) return row.status;
  if (row.status === "paid" && checkRefunds) {
    const result = await inquireSafepay(row.providerTxnId, row.amount);
    return TAKEN_BACK.has(result.code) ? revokePaidPayment(row.id, result.code) : row.status;
  }
  if (row.status !== "pending") return row.status;
  const result = await inquireSafepay(row.providerTxnId, row.amount);
  return applyGatewayResult(row.id, result);
}

/**
 * Background reconcile (cron): payments still "pending" between 15 minutes and 3 days old are
 * re-checked with Safepay, for customers whose browser never came back and whose webhook was
 * missed. Safepay's own answer decides (paid, failed, expired…), exactly as on the return page.
 */
export async function reconcilePendingPayments(limit = 30) {
  const rows = await db
    .select()
    .from(payment)
    .where(
      and(
        eq(payment.status, "pending"),
        sql`${payment.providerTxnId} is not null`,
        sql`${payment.createdAt} < now() - interval '15 minutes'`,
        sql`${payment.createdAt} > now() - interval '3 days'`
      )
    )
    .orderBy(payment.createdAt)
    .limit(limit);
  const summary = { checked: 0, paid: 0, failed: 0, stillPending: 0, errors: 0 };
  for (const row of rows) {
    try {
      const status = await syncPaymentWithGateway(row);
      summary.checked++;
      if (status === "paid") summary.paid++;
      else if (status === "failed") summary.failed++;
      else summary.stillPending++;
    } catch (error) {
      summary.errors++;
      console.warn(`[payments] reconcile ${row.id} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return summary;
}

/**
 * One of the user's payments, re-checked with Safepay if it's still pending (the browser may have
 * closed before returning, or the webhook is late). Returns the status afterwards.
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
