import type { TitleType } from "@/lib/types";
import { NextResponse, type NextRequest } from "next/server";

import { discoverTitles, isBrowseSort } from "@/lib/tmdb/catalog";
import { CATALOG_CACHE_HEADERS } from "@/lib/server/catalog-http";
import { rateLimit } from "@/lib/server/rate-limit";

const TYPES: TitleType[] = ["movie", "series", "anime"];

/** GET /api/catalog/discover?type=movie&genre=28&sort=popular&page=2 → CatalogPage (browse grids). */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "catalog");
  if (limited) return limited;
  const q = request.nextUrl.searchParams;
  const type = q.get("type") as TitleType;
  const genre = q.get("genre") || "all";
  const sort = q.get("sort") || "popular";
  const page = Number(q.get("page") || 1);
  if (!TYPES.includes(type) || !isBrowseSort(sort) || !/^[a-z0-9-]{1,32}$/.test(genre) || !Number.isInteger(page) || page < 1 || page > 50) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  return NextResponse.json(await discoverTitles(type, { genre, sort, page }), { headers: CATALOG_CACHE_HEADERS });
}
