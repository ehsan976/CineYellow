import { NextResponse } from "next/server";

import { getTitleDetails } from "@/lib/tmdb/catalog";
import { isTitleId } from "@/lib/titles";
import { CATALOG_CACHE_HEADERS } from "@/lib/server/catalog-http";
import { rateLimit } from "@/lib/server/rate-limit";
import { getAvailableTitleIds } from "@/lib/server/video-sources";

/** GET /api/catalog/title/movie-550 → TitleDetails (title, similar titles, IMDb id). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request, "catalog");
  if (limited) return limited;
  const { id } = await params;
  if (!isTitleId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [details, availableIds] = await Promise.all([getTitleDetails(id), getAvailableTitleIds()]);
  if (!details) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // `available`: does CineYellow have a video for it (drives Play vs "Where to Watch").
  return NextResponse.json({ ...details, available: availableIds.includes(id) }, { headers: CATALOG_CACHE_HEADERS });
}
