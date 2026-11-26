import { describe, expect, it } from "vitest";

import { safeNext } from "@/lib/auth/routes";
import { isPrivateAddress } from "@/lib/server/safe-fetch";
import { cleanPlayerPrefs, isHistoryEntry, titleIdsOnly } from "@/lib/user-data";

describe("safeNext (post-login redirect)", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/")).toBe("/");
    expect(safeNext("/title/movie-550?x=1#a")).toBe("/title/movie-550?x=1#a");
    expect(safeNext("/account?trakt=connected")).toBe("/account?trakt=connected");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "https://evil.com",
    "/./..//evil.com",
    "evil.com",
    "",
  ])("sends %j home", (input) => {
    expect(safeNext(input)).toBe("/");
  });

  it("never produces a URL on another host", () => {
    for (const input of ["/%5Cevil.com", "/%09/evil.com", "/../evil.com"]) {
      expect(new URL(safeNext(input), "https://site.example").host).toBe("site.example");
    }
  });
});

describe("isPrivateAddress (SSRF guard)", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])(
    "blocks %s",
    (ip) => expect(isPrivateAddress(ip)).toBe(true)
  );
  it.each(["8.8.8.8", "151.101.1.69", "2606:4700::1111"])("allows %s", (ip) => expect(isPrivateAddress(ip)).toBe(false));
});

describe("watch history validation", () => {
  const entry = { key: "tv-1399:s1e3", titleId: "tv-1399", season: 1, episode: 3, time: 120, duration: 3000 };

  it("accepts a normal entry", () => expect(isHistoryEntry(entry)).toBe(true));
  it("rejects positions that would overflow the database", () => expect(isHistoryEntry({ ...entry, time: 1e15 })).toBe(false));
  it("rejects ids from the old mock catalog", () => expect(isHistoryEntry({ ...entry, titleId: "stranger-things", key: "stranger-things" })).toBe(false));
  it("rejects a key that belongs to another title", () => expect(isHistoryEntry({ ...entry, key: "tv-1:s1e3" })).toBe(false));
  it("keeps only real title ids in My List, without duplicates", () =>
    expect(titleIdsOnly(["movie-550", "old-mock-id", "movie-550", "tv-1399"])).toEqual(["movie-550", "tv-1399"]));
});

describe("player preferences", () => {
  it("keeps the ad blocker switch when it's a boolean", () => {
    expect(cleanPlayerPrefs({ adBlock: false })).toEqual({ adBlock: false });
    expect(cleanPlayerPrefs({ adBlock: true })).toEqual({ adBlock: true });
  });
  it("drops an ad blocker value that isn't a boolean", () => expect(cleanPlayerPrefs({ adBlock: "off" })).toEqual({}));
});
