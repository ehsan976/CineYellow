import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/**
 * Better Auth client with the admin plugin: adminAuth.admin.listUsers(), banUser(), impersonateUser() …
 * Kept apart from lib/auth/client.ts because adding a plugin there breaks the inferred types of
 * argument-less calls like signOut() while tsconfig has `strict` off. The server still checks
 * that the caller is an admin on every /api/auth/admin/* request.
 */
export const adminAuth = createAuthClient({ plugins: [adminClient()] });

/** A user row as the admin endpoints return it. */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | string | null;
  plan?: string | null;
  createdAt: Date | string;
}

export interface AdminSession {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  expiresAt: Date | string;
  impersonatedBy?: string | null;
}

/**
 * End an admin's "Sign in as user" session. A plain request to Better Auth's endpoint: with
 * `strict` off, the inferred type of adminAuth.admin.stopImpersonating wrongly demands an argument.
 */
export async function stopImpersonating(): Promise<{ error: { message?: string } | null }> {
  try {
    const res = await fetch("/api/auth/admin/stop-impersonating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (res.ok) return { error: null };
    const body = await res.json().catch(() => null);
    return { error: { message: body?.message } };
  } catch {
    return { error: { message: "Can't reach the server." } };
  }
}
