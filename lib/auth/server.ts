import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { PlanId } from "@/lib/types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { billingEnabled } from "@/lib/payments/config";
import { isPlanId } from "@/lib/user-data";
import { createUserDefaults } from "@/lib/server/user-defaults";

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

/** Standard Schema (what Better Auth's field validators accept) for the plan field. */
const planSchema: StandardSchemaV1<unknown, PlanId> = {
  "~standard": {
    version: 1,
    vendor: "cineyellow",
    validate: (value) => (isPlanId(value) ? { value } : { issues: [{ message: "Invalid plan" }] }),
  },
};

/** True when both Google credentials are set in .env — the login pages show the Google button only then. */
export const googleEnabled = Boolean(googleId && googleSecret);

export const auth = betterAuth({
  appName: "CineYellow",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: googleEnabled
    ? { google: { clientId: googleId!, clientSecret: googleSecret!, prompt: "select_account" } }
    : {},
  session: {
    // A signed copy of the session in a cookie for 5 minutes, so proxy.ts can check
    // every request without a database round trip.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  user: {
    deleteUser: { enabled: true },
    additionalFields: {
      // Demo mode (no payment gateway keys): chosen on the sign-up form, changed from /account.
      // With ZurvaPay on, the plan comes from paid rows in the `payment` table and users can't
      // set this themselves.
      plan: {
        type: ["basic", "standard", "premium"],
        required: false,
        defaultValue: "standard",
        input: !billingEnabled,
        // The enum type alone doesn't reject other strings; this answers 400 VALIDATION_ERROR.
        validator: { input: planSchema },
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Every new account (email or Google) starts with its own profiles and settings rows.
        after: async (user) => {
          await createUserDefaults({ id: user.id, name: user.name });
        },
      },
    },
  },
  // OAuth failures land on our sign-in page (it shows ?error= as a banner) instead of
  // Better Auth's built-in error page.
  onAPIError: { errorURL: "/login" },
  plugins: [
    // Roles, ban/unban, impersonation and user management for /admin. Every /api/auth/admin/*
    // endpoint checks the caller's role on the server. Make the first admin with
    // `npm run make-admin -- you@example.com`.
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      impersonationSessionDuration: 60 * 60, // 1 hour
      bannedUserMessage: "Your account has been suspended. Please contact support.",
    }),
    // nextCookies must stay last: it lets server actions set the session cookie.
    nextCookies(),
  ],
});
