import { NextResponse } from "next/server";

import { getTitleDetails } from "@/lib/tmdb/catalog";
import { isTitleId } from "@/lib/titles";
import { CATALOG_CACHE_HEADERS } from "@/lib/server/catalog-http";

/** GET /api/catalog/title/movie-550 → TitleDetails (title, similar titles, IMDb id). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isTitleId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const details = await getTitleDetails(id);
  if (!details) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(details, { headers: CATALOG_CACHE_HEADERS });
}
