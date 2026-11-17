// Demo account data (email, plan, notifications), persisted in localStorage.
// When the real API arrives, replace load()/persist() — pages only use these exports.
import type { Account, Listener, Plan, PlanId } from "@/lib/types";


const KEY = "cineyellow:account";

export const plans: Record<PlanId, Plan> = {
  basic: { name: "Basic", price: "$6.99", quality: "720p HD", screens: 1 },
  standard: { name: "Standard", price: "$11.99", quality: "1080p Full HD", screens: 2 },
  premium: { name: "Premium", price: "$17.99", quality: "4K Ultra HD", screens: 4 },
};

const DEFAULTS: Account = Object.freeze({
  email: "guest@cineyellow.app",
  plan: "premium",
  memberSince: "2026-01-15",
  notifications: { newEpisodes: true, recommendations: true, emailUpdates: false },
});

const listeners = new Set<Listener>();
let cache: Account | null = null;

function load(): Account {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (parsed && typeof parsed === "object" && parsed.email) {
      return { ...DEFAULTS, ...parsed, notifications: { ...DEFAULTS.notifications, ...parsed.notifications } };
    }
  } catch {
    // fall through
  }
  return DEFAULTS;
}

export function getAccount(): Account {
  if (cache === null) cache = load();
  return cache;
}

export function getServerAccount(): Account {
  return DEFAULTS;
}

export function subscribeAccount(listener: Listener) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateAccount(patch: Partial<Account>) {
  cache = { ...getAccount(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked — keep in memory.
  }
  listeners.forEach((listener) => listener());
}
