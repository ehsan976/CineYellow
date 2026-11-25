// Safepay (getsafepay.com) — Pakistani payment gateway with a hosted checkout page. It turns on
// only when its keys are set in .env; without them the site stays in demo mode (plans switch for
// free), like Google sign-in without its keys.
//
// A payment buys PLAN_DAYS of access; the viewer pays again when it runs out.

import "server-only";
import { getSiteUrl } from "@/lib/server/site-url";

const env = (name: string) => process.env[name]?.trim() || "";

/** Days of access one payment gives. */
export const PLAN_DAYS = 30;

export const safepay = {
  /** Public key ("sec_…") — Safepay calls it merchant_api_key. Dashboard → Developers → API. */
  publicKey: env("SAFEPAY_PUBLIC_KEY"),
  /** Secret key, sent as the X-SFPY-MERCHANT-SECRET header. Server only. */
  secretKey: env("SAFEPAY_SECRET_KEY"),
  /** Webhook endpoint's shared secret (Dashboard → Developers → Endpoints). Optional. */
  webhookSecret: env("SAFEPAY_WEBHOOK_SECRET"),
  live: env("SAFEPAY_ENV") === "production",
  get environment() {
    return this.live ? "production" : "sandbox";
  },
  /** SAFEPAY_API_URL overrides the host (e.g. a local mock while testing). */
  get apiUrl() {
    return env("SAFEPAY_API_URL") || (this.live ? "https://api.getsafepay.com" : "https://sandbox.api.getsafepay.com");
  },
  /** Hosted checkout page (from Safepay's @sfpy/node-core createCheckoutUrl). */
  get checkoutUrl() {
    return this.live ? "https://getsafepay.com/embedded/" : "https://sandbox.api.getsafepay.com/embedded/";
  },
  get enabled() {
    return Boolean(this.publicKey && this.secretKey);
  },
};

/** Public site URL, used for Safepay's redirect and cancel URLs. */
export const siteUrl = getSiteUrl();

export const billingEnabled = safepay.enabled;
