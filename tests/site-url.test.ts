import { afterEach, describe, expect, it, vi } from "vitest";

import { getSiteUrl, getTrustedOrigins } from "@/lib/server/site-url";

const VARS = ["BETTER_AUTH_URL", "VERCEL", "VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_BRANCH_URL"];
const setEnv = (values: Record<string, string>) => {
  for (const name of VARS) vi.stubEnv(name, values[name] ?? "");
};

afterEach(() => vi.unstubAllEnvs());

describe("site URL for sign-in, payments and callbacks", () => {
  it("uses BETTER_AUTH_URL when it's set", () => {
    setEnv({ BETTER_AUTH_URL: "https://cineyellow.com/", VERCEL: "1", VERCEL_PROJECT_PRODUCTION_URL: "cineyellow.vercel.app" });
    expect(getSiteUrl()).toBe("https://cineyellow.com");
  });

  it("falls back to Vercel's production domain when BETTER_AUTH_URL is missing", () => {
    setEnv({ VERCEL: "1", VERCEL_PROJECT_PRODUCTION_URL: "cineyellow.vercel.app" });
    expect(getSiteUrl()).toBe("https://cineyellow.vercel.app");
  });

  it("ignores a localhost BETTER_AUTH_URL copied to Vercel", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setEnv({ BETTER_AUTH_URL: "http://localhost:3000", VERCEL: "1", VERCEL_PROJECT_PRODUCTION_URL: "cineyellow.vercel.app" });
    expect(getSiteUrl()).toBe("https://cineyellow.vercel.app");
  });

  it("keeps localhost in local development", () => {
    setEnv({ BETTER_AUTH_URL: "http://localhost:3000" });
    expect(getSiteUrl()).toBe("http://localhost:3000");
    setEnv({});
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("trusts the deployment's own Vercel addresses", () => {
    setEnv({
      BETTER_AUTH_URL: "https://cineyellow.com",
      VERCEL: "1",
      VERCEL_PROJECT_PRODUCTION_URL: "cineyellow.vercel.app",
      VERCEL_URL: "cineyellow-abc123.vercel.app",
    });
    expect(getTrustedOrigins()).toEqual(["https://cineyellow.com", "https://cineyellow.vercel.app", "https://cineyellow-abc123.vercel.app"]);
  });
});
