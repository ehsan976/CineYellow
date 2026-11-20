import { createAuthClient } from "better-auth/react";

// Same origin as the app, so no baseURL is needed.
// (inferAdditionalFields isn't used: with `strict` off in tsconfig it breaks the inferred types
// of other methods. The extra `plan` field is typed by hand below and in auth-store.ts.)
// Admin calls use their own client (lib/auth/admin-client.ts) for the same reason.
export const authClient = createAuthClient();

/** The signed-in user and session, as Better Auth returns them (matches db/auth-schema.ts). */
export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    /** Additional field (lib/auth/server.ts): "basic" | "standard" | "premium". */
    plan?: string | null;
    /** From the admin plugin: "user" or "admin". */
    role?: string | null;
    banned?: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    /** Set while an admin is signed in as this user (admin plugin). */
    impersonatedBy?: string | null;
  };
}

/**
 * authClient.useSession() with explicit types. Better Auth's inferred types need
 * `strict` mode in tsconfig (this project has it off), so they're spelled out here.
 */
export function useSession() {
  return authClient.useSession() as unknown as {
    data: AuthSession | null;
    isPending: boolean;
    error: { message?: string; status?: number } | null;
    refetch: () => Promise<void>;
  };
}
