import { NextResponse, type NextRequest } from "next/server";

import { getTitlesByIds } from "@/lib/tmdb/catalog";
import { isTitleId } from "@/lib/titles";
import { CATALOG_CACHE_HEADERS } from "@/lib/server/catalog-http";
import { rateLimit } from "@/lib/server/rate-limit";

/** GET /api/catalog/titles?ids=movie-550,tv-1399 → { titles: { id: Title | null } }. Up to 50 ids. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "catalog");
  if (limited) return limited;
  const raw = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 50);
  if (!ids.length) return NextResponse.json({ error: "ids is required" }, { status: 400 });
  const titles = await getTitlesByIds(ids.filter(isTitleId));
  for (const id of ids) titles[id] ??= null;
  return NextResponse.json({ titles }, { headers: CATALOG_CACHE_HEADERS });
}
