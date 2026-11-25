// TMDB (themoviedb.org): titles, posters, cast and episodes. Server only: the keys are never
// sent to the browser. Without a key the catalog is empty and pages show an empty state.

import "server-only";

const env = (name: string) => process.env[name]?.trim() || "";

export const tmdb = {
  /** v4 "API Read Access Token" (sent as a Bearer token). Preferred. */
  readToken: env("TMDB_READ_TOKEN"),
  /** v3 "API Key" (sent as ?api_key=). Used when there is no read token. */
  apiKey: env("TMDB_API_KEY"),
  /** Region for "now playing" and age certifications. */
  region: (env("TMDB_REGION") || "IN").toUpperCase(),
  /** Language of titles and overviews. */
  language: env("TMDB_LANGUAGE") || "en-US",
  get enabled() {
    return Boolean(this.readToken || this.apiKey);
  },
};

export const TMDB_API = "https://api.themoviedb.org/3";
export const TMDB_IMAGES = "https://image.tmdb.org/t/p";
