// Sign-in actions, backed by Better Auth (lib/auth/server.ts on the server, lib/auth/client.ts here).
// Forms call these and get back { ok, error } with a message that's safe to show.
import type { AuthResult, PlanId } from "@/lib/types";
import { authClient } from "@/lib/auth/client";
import { flushProgress } from "@/lib/stores/user-data-store";

export { safeNext } from "@/lib/auth/routes";

type AuthError = { code?: string; message?: string; status?: number } | null | undefined;

/** Better Auth error codes → friendly text. */
function friendly(error: AuthError, fallback: string): string {
  const code = error?.code ?? "";
  if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_PASSWORD" || code === "CREDENTIAL_ACCOUNT_NOT_FOUND")
    return "Incorrect email or password. Please try again.";
  if (code.startsWith("USER_ALREADY_EXISTS")) return "An account with this email already exists. Sign in instead.";
  if (code === "PASSWORD_TOO_SHORT") return "Use at least 8 characters.";
  if (code === "PASSWORD_TOO_LONG") return "That password is too long.";
  if (code === "INVALID_EMAIL") return "Please enter a valid email address.";
  if (code === "BANNED_USER") return "Your account has been suspended. Please contact support.";
  if (code === "INVALID_TOKEN") return "This reset link has expired or was already used. Ask for a new one.";
  if (error?.status === 429) return "Too many attempts. Wait a minute and try again.";
  if (!error?.status) return "Can't reach the server. Check your connection and try again.";
  return error?.message || fallback;
}

async function run(call: () => Promise<{ error: AuthError }>, fallback: string): Promise<AuthResult> {
  try {
    const { error } = await call();
    return error ? { ok: false, error: friendly(error, fallback) } : { ok: true };
  } catch {
    return { ok: false, error: friendly(null, fallback) };
  }
}

/** "Remember me" off → the session cookie ends when the browser closes. */
export function signIn({ email, password, remember = true }: { email: string; password: string; remember?: boolean }) {
  return run(() => authClient.signIn.email({ email, password, rememberMe: remember }), "Couldn't sign you in.");
}

/**
 * Demo mode: `plan` is stored on Better Auth's user row (an additional field, see lib/auth/server.ts).
 * With Safepay on, leave it out — the plan comes from a payment instead.
 */
export function signUp({ name, email, password, plan }: { name: string; email: string; password: string; plan?: PlanId }) {
  const body = { name, email, password, ...(plan ? { plan } : {}) } as Parameters<typeof authClient.signUp.email>[0];
  return run(() => authClient.signUp.email(body), "Couldn't create your account.");
}

/** Leaves the site for Google; Better Auth brings the user back to `next` once signed in. */
export function signInWithGoogle(next: string) {
  return run(
    () => authClient.signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: "/login" }),
    "Couldn't start Google sign-in."
  );
}

// Set while the user signs out or deletes their account on purpose, so AppProvider's
// "session ended" watch doesn't race the page's own redirect to /welcome.
let leaving = false;
export const isLeaving = () => leaving;

export async function signOut() {
  leaving = true;
  // Save the last few seconds of watch progress while the session still exists.
  await flushProgress().catch(() => {});
  try {
    await authClient.signOut();
  } catch {
    // Already signed out or offline — the proxy treats a missing session the same way.
  }
}

export function changePassword({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
  return run(
    () => authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true }),
    "Couldn't change your password."
  );
}

/**
 * Emails a reset link. Succeeds whether or not the address has an account (so the form can't be
 * used to find out who is signed up). The link opens /reset-password?token=…
 */
export function requestPasswordReset(email: string) {
  return run(() => authClient.requestPasswordReset({ email, redirectTo: "/reset-password" }), "Couldn't send the reset link.");
}

/** Sets a new password with the token from the reset link. Every device is signed out. */
export function resetPassword({ token, newPassword }: { token: string; newPassword: string }) {
  return run(() => authClient.resetPassword({ token, newPassword }), "Couldn't reset your password.");
}

export async function deleteAccount() {
  leaving = true;
  const result = await run(() => authClient.deleteUser(), "Couldn't delete your account.");
  if (!result.ok) leaving = false;
  return result;
}
