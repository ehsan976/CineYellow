// Safepay Express (hosted) Checkout. Server only.
//
// 1. POST /order/payments/v3/        → a tracker for this amount (merchant_api_key + secret key)
// 2. POST /client/passport/v1/token  → a short-lived token (tbt) for the checkout page
// 3. Send the browser to /embedded/?environment&tracker&tbt&source=hosted&redirect_url&cancel_url
// 4. The shopper comes back to redirect_url with ?tracker=…; we ask Safepay for the tracker's
//    state and only a TRACKER_ENDED tracker with the right amount counts as paid.
// Webhooks (payment.succeeded) are signed: X-SFPY-SIGNATURE = HMAC-SHA512(body, shared secret), hex.
// (From apidocs.getsafepay.com, safepay-docs.netlify.app and the official @sfpy/node-core.)
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

import { safepay, siteUrl } from "@/lib/payments/config";

export type GatewayStatus = "paid" | "pending" | "failed";

export interface GatewayResult {
  status: GatewayStatus;
  code: string;
  message: string;
  /** Safepay tracker token. */
  txnId?: string;
  /** How the customer paid, e.g. "card". */
  method?: string;
}

export const SAFEPAY_RETURN_PATH = "/api/payments/safepay";

/** Read a nested value from Safepay's JSON without trusting its shape. */
function dig(value: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>(
    (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
    value
  );
}

async function call(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${safepay.apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-SFPY-MERCHANT-SECRET": safepay.secretKey,
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errors = dig(body, "status", "errors");
    const reason = (Array.isArray(errors) ? errors.join(", ") : "") || String(dig(body, "message") ?? res.statusText);
    throw new Error(`Safepay ${path} failed (${res.status}): ${reason}`);
  }
  return body;
}

/** Safepay amounts are in the lowest denomination (paisa). */
export const toPaisa = (rupees: number) => Math.round(rupees * 100);

/** Create the tracker and the hosted checkout URL for one payment. */
export async function createSafepayCheckout({ ref, amount }: { ref: string; amount: number }) {
  const setup = await call("/order/payments/v3/", {
    method: "POST",
    body: JSON.stringify({
      merchant_api_key: safepay.publicKey,
      intent: "CYBERSOURCE",
      mode: "payment",
      currency: "PKR",
      amount: toPaisa(amount),
      metadata: { order_id: ref, source: "cineyellow" },
    }),
  });
  const tracker = dig(setup, "data", "tracker", "token");
  if (typeof tracker !== "string" || !tracker) throw new Error("Safepay didn't return a tracker");
  // Which payment channels this merchant account has switched on, e.g. {"CYBERSOURCE":true}.
  // Wallets such as Easypaisa have no intent of their own: Safepay enables them on the account
  // (ask Safepay support), and the hosted checkout then shows them. Logged so that's easy to check.
  const capabilities = dig(setup, "data", "capabilities") ?? null;
  console.log("Safepay capabilities:", JSON.stringify(capabilities));

  const passport = await call("/client/passport/v1/token", { method: "POST", body: "{}" });
  const tbt = dig(passport, "data");
  if (typeof tbt !== "string" || !tbt) throw new Error("Safepay didn't return a checkout token");

  const params = new URLSearchParams({
    environment: safepay.environment,
    tracker,
    tbt,
    source: "hosted",
    redirect_url: `${siteUrl}${SAFEPAY_RETURN_PATH}?ref=${encodeURIComponent(ref)}`,
    cancel_url: `${siteUrl}/account?payment=cancelled`,
  });
  return { tracker, url: `${safepay.checkoutUrl}?${params}`, capabilities };
}

/**
 * Ask Safepay for a tracker's state (GET /order/payments/v3/<tracker>/status). Paid only when the
 * tracker has ENDED for the amount we asked for; anything still in progress stays pending.
 */
export async function inquireSafepay(tracker: string, expectedRupees: number): Promise<GatewayResult> {
  const body = await call(`/order/payments/v3/${encodeURIComponent(tracker)}/status`);
  const t = dig(body, "data", "tracker") ?? dig(body, "data");
  const state = String(dig(t, "state") ?? "");
  const amount = Number(dig(t, "purchase_totals", "base_amount", "amount") ?? NaN);
  const currency = String(dig(t, "purchase_totals", "base_amount", "currency") ?? "PKR");
  const kind = dig(t, "payment_method_kind");
  const method = kind ? String(kind) : undefined;

  if (state === "TRACKER_ENDED") {
    if (amount !== toPaisa(expectedRupees) || currency !== "PKR") {
      return { status: "failed", code: "AMOUNT_MISMATCH", message: `Paid ${amount} ${currency}`, txnId: tracker, method };
    }
    return { status: "paid", code: state, message: "", txnId: tracker, method };
  }
  if (["TRACKER_REVERSED", "TRACKER_REFUNDED", "TRACKER_VOIDED", "TRACKER_CANCELLED", "TRACKER_EXPIRED"].includes(state)) {
    return { status: "failed", code: state, message: "", txnId: tracker, method };
  }
  return { status: "pending", code: state, message: "", txnId: tracker, method };
}

/**
 * X-SFPY-SIGNATURE check. Safepay's docs hash the event as a JSON string; we accept the exact raw
 * body or its re-serialised form, compared in constant time.
 */
export function verifySafepayWebhook(rawBody: string, signature: string) {
  if (!safepay.webhookSecret || !signature) return false;
  const got = Buffer.from(signature.trim().toLowerCase());
  const candidates = [rawBody];
  try {
    candidates.push(JSON.stringify(JSON.parse(rawBody)));
  } catch {
    return false;
  }
  return candidates.some((payload) => {
    const expected = Buffer.from(createHmac("sha512", safepay.webhookSecret).update(payload).digest("hex"));
    return expected.length === got.length && timingSafeEqual(expected, got);
  });
}
