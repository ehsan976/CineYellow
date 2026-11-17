// Sign-in state. This is the one place to connect the real auth API:
// replace the bodies of signIn / signUp / signOut with API calls (keep the return shape).
//
// Two pieces of state:
//  - a `cineyellow_session` cookie, read by proxy.js to send signed-out visitors to /login
//    before any page renders (like Netflix);
//  - the profile info in localStorage (only when "Remember me" is on).
import type { AuthResult, AuthState, Listener } from "@/lib/types";


export const SESSION_COOKIE = "cineyellow_session";
const KEY = "cineyellow:auth";
const SIGNED_OUT: AuthState = Object.freeze({ signedIn: false, email: null, name: null });
const listeners = new Set<Listener>();
let cache: AuthState | null = null;

function hasSessionCookie() {
  return document.cookie.split("; ").some((c) => c === `${SESSION_COOKIE}=1`);
}

function setSessionCookie(remember: boolean) {
  const maxAge = remember ? `; max-age=${60 * 60 * 24 * 30}` : ""; // 30 days, or until the browser closes
  document.cookie = `${SESSION_COOKIE}=1; path=/; samesite=lax${maxAge}`;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function load(): AuthState {
  if (!hasSessionCookie()) return SIGNED_OUT;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY) ?? "null");
    if (parsed && parsed.signedIn && parsed.email) return parsed;
  } catch {
    // fall through
  }
  return SIGNED_OUT;
}

function persist(next: AuthState, remember = true) {
  cache = next;
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    if (next.signedIn) (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked — stays signed in for this page only.
  }
  if (next.signedIn) setSessionCookie(remember);
  else clearSessionCookie();
  listeners.forEach((listener) => listener());
}

export function getAuth(): AuthState {
  if (cache === null) cache = load();
  return cache;
}

export function getServerAuth(): AuthState {
  return SIGNED_OUT;
}

export function subscribeAuth(listener: Listener) {
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

/** Demo sign-in: any valid email + password (6+ chars) works. */
export async function signIn({ email, password, remember = true }: { email: string; password: string; remember?: boolean }): Promise<AuthResult> {
  if (!email || !password || password.length < 6) return { ok: false, error: "Incorrect email or password." };
  persist({ signedIn: true, email, name: email.split("@")[0] }, remember);
  return { ok: true };
}

/** Demo sign-in code: any 4 digits work. */
export async function signInWithCode({ email, code, remember = true }: { email: string; code: string; remember?: boolean }): Promise<AuthResult> {
  if (!email || !/^\d{4}$/.test(code)) return { ok: false, error: "That code isn't right. Check it and try again." };
  persist({ signedIn: true, email, name: email.split("@")[0] }, remember);
  return { ok: true };
}

export async function signUp({ name, email, password }: { name: string; email: string; password: string }): Promise<AuthResult> {
  if (!name || !email || !password) return { ok: false, error: "Please fill in every field." };
  persist({ signedIn: true, email, name });
  return { ok: true };
}

export function signOut() {
  persist(SIGNED_OUT);
}

/** Only allow same-site paths as a post-login redirect. */
export function safeNext(next: string | null | undefined): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
