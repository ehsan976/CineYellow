// Account data: email and member-since come from Better Auth's user row; the plan from paid
// ZurvaPay payments (or, in demo mode, the user's `plan` field); notifications from
// the user_settings table — all loaded via /api/me.
import type { Account, Plan, PlanId } from "@/lib/types";
import { PLAN_PRICES_PKR, formatPkr } from "@/lib/user-data";
import {
  getServerUserDataState,
  getUserDataState,
  subscribeUserData,
  updateAccount as update,
} from "@/lib/stores/user-data-store";

/** Prices come from PLAN_PRICES_PKR (lib/user-data.ts), the same numbers the server charges. */
export const plans: Record<PlanId, Plan> = {
  basic: { name: "Basic", price: formatPkr(PLAN_PRICES_PKR.basic), quality: "720p HD", screens: 1 },
  standard: { name: "Standard", price: formatPkr(PLAN_PRICES_PKR.standard), quality: "1080p Full HD", screens: 2 },
  premium: { name: "Premium", price: formatPkr(PLAN_PRICES_PKR.premium), quality: "4K Ultra HD", screens: 4 },
};

export function getAccount(): Account {
  return getUserDataState().account;
}

export function getServerAccount(): Account {
  return getServerUserDataState().account;
}

export const subscribeAccount = subscribeUserData;

/** Plan and notification changes are saved to the database; rolled back with a toast on failure. */
export function updateAccount(patch: Partial<Pick<Account, "plan" | "notifications">>) {
  update(patch);
}
