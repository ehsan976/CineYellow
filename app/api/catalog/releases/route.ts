import { NextResponse, type NextRequest } from "next/server";

import { getReleaseInfo } from "@/lib/tmdb/catalog";
import { mapLimit } from "@/lib/tmdb/client";
import { isTitleId } from "@/lib/titles";
import { CATALOG_CACHE_HEADERS } from "@/lib/server/catalog-http";
import { rateLimit } from "@/lib/server/rate-limit";

/**
 * GET /api/catalog/releases?ids=movie-550,tv-1399 → { releases: ReleaseInfo[] } for the bell's
 * My List reminders (lib/releases.ts). Up to 50 ids; unknown ones are left out.
 */
export async function GET(request: NextRequest) {
  // Several TMDB lookups per call, like For You.
  const limited = rateLimit(request, "forYou");
  if (limited) return limited;
  const raw = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(isTitleId))].slice(0, 50);
  if (!ids.length) return NextResponse.json({ error: "ids is required" }, { status: 400 });
  const releases = (await mapLimit(ids, 8, getReleaseInfo)).filter(Boolean);
  return NextResponse.json({ releases }, { headers: CATALOG_CACHE_HEADERS });
}
