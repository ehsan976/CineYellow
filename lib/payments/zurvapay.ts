// ZurvaPay hosted checkout (JazzCash / EasyPaisa / Raast QR). Server only.
//
// 1. POST /payment/initiate (form data) → a checkout `url` and ZurvaPay's transaction id (TID)
// 2. Send the browser to that url; the customer pays and comes back to success_url / cancel_url
// 3. The result is only trusted from a signed answer: the IPN that ZurvaPay POSTs to ipn_url, or
//    POST /payment/status (authenticated with the secret key). Both carry
//      signature        = UPPER(HMAC-SHA256(amount + identifier, secret))
//      status_signature = UPPER(HMAC-SHA256(status + "|" + identifier + "|" + amount, secret))
//    computed over the raw amount string (e.g. "500.00000000").
// (From https://zurvapay.com/api/documentation.)
import { createHmac, timingSafeEqual } from "node:crypto";

import { siteUrl, zurvapay } from "@/lib/payments/config";

export type GatewayStatus = "paid" | "pending" | "failed";

export interface GatewayResult {
  status: GatewayStatus;
  code: string;
  message: string;
  /** ZurvaPay transaction id (TID), e.g. "IC9CI8LI8IIR". */
  txnId?: string;
  /** How the customer paid: "jazzcash", "easypaisa" or "dqrc" (Raast QR). */
  method?: string;
}

export const ZURVAPAY_RETURN_PATH = "/api/payments/zurvapay";
export const ZURVAPAY_IPN_PATH = "/api/payments/zurvapay/ipn";

/** Readable names for ZurvaPay's payment_method values. */
const METHOD_NAMES: Record<string, string> = { jazzcash: "JazzCash", easypaisa: "EasyPaisa", dqrc: "Raast QR" };
const methodName = (value: unknown) => {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw ? (METHOD_NAMES[raw.toLowerCase()] ?? raw) : undefined;
};

/** POST form data to ZurvaPay and return its JSON. ZurvaPay reports errors in the body, not the HTTP code. */
async function post(path: string, fields: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(`${zurvapay.apiUrl}${path}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new Error(`ZurvaPay ${path} answered HTTP ${res.status} without JSON`);
  if (body.success !== "ok") {
    const errors = Array.isArray(body.errors) ? body.errors.join(", ") : "";
    throw new Error(`ZurvaPay ${path} failed: ${errors || String(body.message ?? `HTTP ${res.status}`)}`);
  }
  return body;
}

const sign = (message: string) => createHmac("sha256", zurvapay.secretKey).update(message).digest("hex").toUpperCase();

function sameText(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b.trim().toUpperCase());
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Both ZurvaPay signatures over the raw amount string, compared in constant time. */
export function verifyZurvapaySignatures(p: {
  status: string;
  identifier: string;
  amount: string;
  signature: string;
  statusSignature: string;
}) {
  if (!zurvapay.secretKey || !p.signature || !p.statusSignature) return false;
  return (
    sameText(sign(p.amount + p.identifier), p.signature) &&
    sameText(sign(`${p.status}|${p.identifier}|${p.amount}`), p.statusSignature)
  );
}

/** ZurvaPay limits: customer_name 30, customer_email 30, details 100 characters. */
const clip = (value: string, max: number) => value.trim().slice(0, max);

/** Start one payment and get the hosted checkout URL. `ref` is our payment id (≤ 20 characters). */
export async function createZurvapayCheckout({
  ref,
  amount,
  details,
  customerName,
  customerEmail,
}: {
  ref: string;
  amount: number;
  details: string;
  customerName: string;
  customerEmail: string;
}) {
  const back = `${siteUrl}${ZURVAPAY_RETURN_PATH}?ref=${encodeURIComponent(ref)}`;
  const fields: Record<string, string> = {
    public_key: zurvapay.publicKey,
    identifier: ref,
    currency: "PKR",
    amount: String(amount),
    details: clip(details, 100),
    success_url: back,
    cancel_url: `${back}&cancelled=1`,
    customer_name: clip(customerName || "CineYellow member", 30),
    customer_email: customerEmail.trim(),
    checkout_theme: "dark",
  };
  // ZurvaPay can't reach localhost, so the IPN is only sent for a public https site. Without it the
  // result comes from the status API (on return, "Check status", or the account page).
  if (siteUrl.startsWith("https://")) fields.ipn_url = `${siteUrl}${ZURVAPAY_IPN_PATH}`;

  const body = await post("/payment/initiate", fields);
  const url = body.url;
  if (typeof url !== "string" || !url) throw new Error("ZurvaPay didn't return a checkout url");
  const trx = typeof body.payment_trx === "string" ? body.payment_trx : "";
  return { url, trx };
}

/**
 * Turn a signed "success" from ZurvaPay into our result: paid only for the amount and currency
 * we asked for.
 */
export function paidResult(
  p: { amount: string; currency?: string; trx?: string; method?: unknown },
  expectedRupees: number
): GatewayResult {
  const method = methodName(p.method);
  const currency = p.currency || "PKR";
  if (Math.round(Number(p.amount) * 100) !== expectedRupees * 100 || currency !== "PKR") {
    return { status: "failed", code: "AMOUNT_MISMATCH", message: `Paid ${p.amount} ${currency}`, txnId: p.trx, method };
  }
  return { status: "paid", code: "success", message: "", txnId: p.trx, method };
}

/** Ask ZurvaPay for one payment's state (POST /payment/status) by our identifier. */
export async function inquireZurvapay(identifier: string, expectedRupees: number): Promise<GatewayResult> {
  const body = await post("/payment/status", {
    public_key: zurvapay.publicKey,
    secret_key: zurvapay.secretKey,
    identifier,
  });
  const p = (body.payment ?? {}) as Record<string, unknown>;
  const status = String(p.status ?? "");
  const trx = typeof p.payment_trx === "string" ? p.payment_trx : undefined;

  if (status === "success") {
    const amount = String(p.amount ?? "");
    const signed = verifyZurvapaySignatures({
      status,
      identifier: String(p.identifier ?? identifier),
      amount,
      signature: String(p.signature ?? ""),
      statusSignature: String(p.status_signature ?? ""),
    });
    if (!signed) {
      // Never give access on an unsigned "success"; leave it pending and look into it.
      console.error(`ZurvaPay status: bad signature for ${identifier}`);
      return { status: "pending", code: "BAD_SIGNATURE", message: "", txnId: trx };
    }
    const currency = (p.currency as { code?: string } | undefined)?.code;
    return paidResult({ amount, currency, trx, method: p.payment_method }, expectedRupees);
  }
  if (status === "failed") {
    return { status: "failed", code: "failed", message: String(p.reason ?? ""), txnId: trx, method: methodName(p.payment_method) };
  }
  // "pending" (checkout open / being verified) or "not_found" (never reached checkout).
  return { status: "pending", code: status || "unknown", message: "", txnId: trx };
}
