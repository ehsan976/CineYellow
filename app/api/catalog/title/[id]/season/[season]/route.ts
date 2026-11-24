import { NextResponse } from "next/server";

import { getEpisodes, getTitle } from "@/lib/tmdb/catalog";
import { parseTitleId } from "@/lib/titles";
import { CATALOG_CACHE_HEADERS } from "@/lib/server/catalog-http";

/** GET /api/catalog/title/tv-1399/season/2 → { episodes }. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; season: string }> }) {
  const { id, season } = await params;
  const n = Number(season);
  if (parseTitleId(id)?.media !== "tv" || !Number.isInteger(n) || n < 1 || n > 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const title = await getTitle(id);
  if (!title) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ episodes: await getEpisodes(title, n) }, { headers: CATALOG_CACHE_HEADERS });
}
