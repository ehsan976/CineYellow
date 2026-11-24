/** Public TMDB data: browsers and CDNs may keep it for a few minutes. */
export const CATALOG_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
};
