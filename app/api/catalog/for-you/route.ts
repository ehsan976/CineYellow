import type { Title } from "@/lib/types";
import { NextResponse, type NextRequest } from "next/server";

import { getTitleDetails } from "@/lib/tmdb/catalog";
import { mapLimit } from "@/lib/tmdb/client";
import { isTitleId } from "@/lib/titles";
import { CATALOG_CACHE_HEADERS } from "@/lib/server/catalog-http";
import { rateLimit } from "@/lib/server/rate-limit";

const MAX_SEEDS = 8;
/** "Because you watched" rows: one per seed, for the first few seeds. */
const BECAUSE_ROWS = 2;
const ROW_SIZE = 12;
const FOR_YOU_SIZE = 20;

/**
 * GET /api/catalog/for-you?seeds=tv-1399,movie-550 → personal rows from the titles a profile
 * watched or saved, most important first (the browser sends its own history + My List ids).
 *   { because: [{ seed: Title, items: Title[] }], forYou: Title[] }
 * Each seed's "similar" list comes from getTitleDetails (cached per title), so this is cheap.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "forYou");
  if (limited) return limited;

  const raw = request.nextUrl.searchParams.get("seeds") ?? "";
  const seeds = [...new Set(raw.split(",").map((s) => s.trim()))].filter(isTitleId).slice(0, MAX_SEEDS);
  if (!seeds.length) return NextResponse.json({ error: "seeds is required" }, { status: 400 });

  const details = await mapLimit(seeds, 4, (id) => getTitleDetails(id));
  const seedSet = new Set(seeds);

  // Score: an earlier (more recent) seed counts more; a title similar to several seeds counts more.
  const scores = new Map<string, { title: Title; score: number }>();
  details.forEach((d, i) => {
    if (!d) return;
    const weight = MAX_SEEDS - i;
    d.similar.forEach((t, rank) => {
      if (seedSet.has(t.id)) return;
      const entry = scores.get(t.id) ?? { title: t, score: 0 };
      entry.score += weight * (1 - rank / (d.similar.length + 1)) + 2;
      scores.set(t.id, entry);
    });
  });

  const because = details
    .map((d) => d && { seed: d.title, items: d.similar.filter((t) => !seedSet.has(t.id)).slice(0, ROW_SIZE) })
    .filter((row): row is { seed: Title; items: Title[] } => Boolean(row?.items.length))
    .slice(0, BECAUSE_ROWS);

  // "Top picks" shouldn't just repeat the first "Because you watched" row.
  const inFirstRow = new Set(because[0]?.items.slice(0, 6).map((t) => t.id));
  const forYou = [...scores.values()]
    .sort((a, b) => b.score - a.score || b.title.popularity - a.title.popularity)
    .map((e) => e.title)
    .filter((t) => !inFirstRow.has(t.id))
    .slice(0, FOR_YOU_SIZE);

  return NextResponse.json({ because, forYou }, { headers: CATALOG_CACHE_HEADERS });
}
