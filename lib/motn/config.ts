// Movie of the Night — Streaming Availability API (v4). Used only for the audio and subtitle
// languages of a title. Server only. Without a key, languages come only from what admins enter.

import "server-only";

const env = (name: string) => process.env[name]?.trim() || "";

export const motn = {
  apiKey: env("MOTN_API_KEY"),
  /** RapidAPI (default) or the developer platform (https://api.movieofthenight.com/v4). */
  base: (env("MOTN_API_BASE") || "https://streaming-availability.p.rapidapi.com").replace(/\/$/, ""),
  host: env("MOTN_API_HOST") || "streaming-availability.p.rapidapi.com",
  /** Pakistan isn't supported by the API; India is the closest catalog. */
  country: (env("MOTN_COUNTRY") || "in").toLowerCase(),
  get enabled() {
    return Boolean(this.apiKey);
  },
  get isRapidApi() {
    try {
      return new URL(this.base).hostname.endsWith("rapidapi.com");
    } catch {
      return false;
    }
  },
};
