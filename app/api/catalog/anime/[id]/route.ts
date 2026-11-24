import { NextResponse } from "next/server";

import { getAnimeInfo } from "@/lib/anilist/anime";
import { getTitleDetails } from "@/lib/tmdb/catalog";
import { isTitleId } from "@/lib/titles";
import { CATALOG_CACHE_HEADERS } from "@/lib/server/catalog-http";
import { rateLimit } from "@/lib/server/rate-limit";

/** GET /api/catalog/anime/tv-37854 → AnimeInfo (AniList). 404 when the title isn't anime or has no match. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request, "anime");
  if (limited) return limited;
  const { id } = await params;
  if (!isTitleId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const details = await getTitleDetails(id);
  if (!details?.isAnime) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const info = await getAnimeInfo({ id, name: details.title.title, originalName: details.originalTitle, year: details.title.year });
  if (!info) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(info, { headers: CATALOG_CACHE_HEADERS });
}
