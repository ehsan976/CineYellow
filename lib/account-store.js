// Demo account data (email, plan, notifications), persisted in localStorage.
// When the real API arrives, replace load()/persist() — pages only use these exports.

const KEY = "cineyellow:account";

export const plans = {
  basic: { name: "Basic", price: "$6.99", quality: "720p HD", screens: 1 },
  standard: { name: "Standard", price: "$11.99", quality: "1080p Full HD", screens: 2 },
  premium: { name: "Premium", price: "$17.99", quality: "4K Ultra HD", screens: 4 },
};

const DEFAULTS = Object.freeze({
  email: "guest@cineyellow.app",
  plan: "premium",
  memberSince: "2026-01-15",
  notifications: { newEpisodes: true, recommendations: true, emailUpdates: false },
});

const listeners = new Set();
let cache = null;

function load() {
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

export function getAccount() {
  if (cache === null) cache = load();
  return cache;
}

export function getServerAccount() {
  return DEFAULTS;
}

export function subscribeAccount(listener) {
  listeners.add(listener);
  const onStorage = (e) => {
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

export function updateAccount(patch) {
  cache = { ...getAccount(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked — keep in memory.
  }
  listeners.forEach((listener) => listener());
}
