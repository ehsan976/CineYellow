// Trakt (trakt.tv): profiles can link their Trakt account so finished titles land in their
// Trakt history and their Trakt watchlist can be imported into My List. Server only.
// Create an app at https://trakt.tv/oauth/applications with the redirect URI below.
// Without both keys the feature is hidden.

import "server-only";
import { getSiteUrl } from "@/lib/server/site-url";

const env = (name: string) => process.env[name]?.trim() || "";

export const trakt = {
  clientId: env("TRAKT_CLIENT_ID"),
  clientSecret: env("TRAKT_CLIENT_SECRET"),
  get enabled() {
    return Boolean(this.clientId && this.clientSecret);
  },
  /** Must match the redirect URI saved in the Trakt app exactly. */
  get redirectUri() {
    return `${getSiteUrl()}/api/trakt/callback`;
  },
};

export const TRAKT_API = "https://api.trakt.tv";
export const TRAKT_AUTHORIZE_URL = "https://trakt.tv/oauth/authorize";

/** httpOnly cookie holding the OAuth `state` + profile id between connect and callback. */
export const TRAKT_STATE_COOKIE = "cy_trakt_oauth";
