import { NextResponse } from "next/server";

import { getTitleDetails } from "@/lib/tmdb/catalog";
import { isTitleId } from "@/lib/titles";
import { CATALOG_CACHE_HEADERS } from "@/lib/server/catalog-http";
import { rateLimit } from "@/lib/server/rate-limit";

/** GET /api/catalog/title/movie-550 → TitleDetails (title, similar titles, IMDb id). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request, "catalog");
  if (limited) return limited;
  const { id } = await params;
  if (!isTitleId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const details = await getTitleDetails(id);
  if (!details) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Every title plays through the embed servers, so the popup shows Play like the title page.
  return NextResponse.json({ ...details, available: true }, { headers: CATALOG_CACHE_HEADERS });
}
