// ZurvaPay (zurvapay.com) — Pakistani payment gateway with a hosted checkout page where the
// customer pays with JazzCash, EasyPaisa or Raast QR. It turns on only when its keys are set in
// .env; without them the site stays in demo mode (plans switch for free), like Google sign-in
// without its keys.
//
// ZurvaPay is LIVE ONLY: there is no sandbox, every payment moves real money.
// A payment buys PLAN_DAYS of access; the viewer pays again when it runs out.

const env = (name: string) => process.env[name]?.trim() || "";

/** Days of access one payment gives. */
export const PLAN_DAYS = 30;

export const zurvapay = {
  /** Merchant account → Api Key. Identifies the business when starting a payment. */
  publicKey: env("ZURVAPAY_PUBLIC_KEY"),
  /** Verifies IPN / status signatures and authenticates the status API. Server only. */
  secretKey: env("ZURVAPAY_SECRET_KEY"),
  /** ZURVAPAY_API_URL overrides the host (e.g. a local mock while testing). */
  apiUrl: (env("ZURVAPAY_API_URL") || "https://zurvapay.com").replace(/\/$/, ""),
  get enabled() {
    return Boolean(this.publicKey && this.secretKey);
  },
};

/** Public site URL, used for ZurvaPay's success, cancel and IPN URLs. */
export const siteUrl = (env("BETTER_AUTH_URL") || "http://localhost:3000").replace(/\/$/, "");

export const billingEnabled = zurvapay.enabled;
