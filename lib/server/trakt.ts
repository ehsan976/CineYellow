// Trakt links per profile (table trakt_connection): tokens, watchlist import, history sync.
// Callers check the profile belongs to the signed-in user first (requireProfile).
import "server-only";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { myList, traktConnection } from "@/db/schema";
import { decryptToken, encryptToken } from "@/lib/trakt/crypto";
import { expiresAtOf, refreshTokens, revokeToken, traktGet, traktPost, type TraktTokens } from "@/lib/trakt/client";
import { trakt } from "@/lib/trakt/config";
import { makeTitleId, parseTitleId } from "@/lib/titles";

/** Refresh tokens this long before they expire. */
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

export interface TraktStatus {
  /** false when the site has no Trakt keys (the feature is hidden). */
  enabled: boolean;
  connected: boolean;
  username: string;
}

export async function getTraktStatus(profileId: string): Promise<TraktStatus> {
  if (!trakt.enabled) return { enabled: false, connected: false, username: "" };
  const [row] = await db
    .select({ username: traktConnection.username })
    .from(traktConnection)
    .where(eq(traktConnection.profileId, profileId))
    .limit(1);
  return { enabled: true, connected: Boolean(row), username: row?.username ?? "" };
}

export async function saveTraktConnection(profileId: string, tokens: TraktTokens) {
  // The username is only for display ("Connected as …").
  const me = await traktGet<{ user?: { username?: string } }>("/users/settings", tokens.access_token);
  const values = {
    username: (me.ok && me.data?.user?.username) || "",
    accessToken: encryptToken(tokens.access_token),
    refreshToken: encryptToken(tokens.refresh_token),
    expiresAt: expiresAtOf(tokens),
    updatedAt: new Date(),
  };
  await db
    .insert(traktConnection)
    .values({ profileId, ...values })
    .onConflictDoUpdate({ target: traktConnection.profileId, set: values });
  return values.username;
}

/** Removes the link (and tells Trakt to drop the token). */
export async function deleteTraktConnection(profileId: string) {
  const [row] = await db.delete(traktConnection).where(eq(traktConnection.profileId, profileId)).returning();
  const token = row && decryptToken(row.accessToken);
  if (token && trakt.enabled) await revokeToken(token);
}

/**
 * A usable access token for the profile, refreshed when it's about to expire. null when the
 * profile isn't connected, or the link stopped working (then it's removed: the user reconnects).
 */
async function getAccessToken(profileId: string): Promise<string | null> {
  if (!trakt.enabled) return null;
  const [row] = await db.select().from(traktConnection).where(eq(traktConnection.profileId, profileId)).limit(1);
  if (!row) return null;
  const access = decryptToken(row.accessToken);
  const refresh = decryptToken(row.refreshToken);
  if (!access || !refresh) {
    await db.delete(traktConnection).where(eq(traktConnection.profileId, profileId));
    return null;
  }
  if (row.expiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS) return access;

  const res = await refreshTokens(refresh);
  if (res.ok) {
    await db
      .update(traktConnection)
      .set({
        accessToken: encryptToken(res.data.access_token),
        refreshToken: encryptToken(res.data.refresh_token),
        expiresAt: expiresAtOf(res.data),
        updatedAt: new Date(),
      })
      .where(eq(traktConnection.profileId, profileId));
    return res.data.access_token;
  }
  // Revoked on trakt.tv, or the refresh token is no longer valid: forget the link.
  if (res.status === 400 || res.status === 401 || ("error" in res && res.error === "invalid_grant")) {
    await db.delete(traktConnection).where(eq(traktConnection.profileId, profileId));
    return null;
  }
  // Trakt is down: the old token may still work until it actually expires.
  return row.expiresAt.getTime() > Date.now() ? access : null;
}

type WatchlistItem = { movie?: { ids?: { tmdb?: number | null } }; show?: { ids?: { tmdb?: number | null } } };

/**
 * Adds the profile's Trakt watchlist (movies and shows with a TMDB id) to My List.
 * Returns how many were new, or null when the profile isn't connected / Trakt failed.
 */
export async function importTraktWatchlist(profileId: string): Promise<{ added: number; total: number } | null> {
  const token = await getAccessToken(profileId);
  if (!token) return null;
  const [movies, shows] = await Promise.all([
    traktGet<WatchlistItem[]>("/sync/watchlist/movies", token),
    traktGet<WatchlistItem[]>("/sync/watchlist/shows", token),
  ]);
  if (!movies.ok || !shows.ok) return null;

  const ids = [
    ...movies.data.map((i) => i.movie?.ids?.tmdb && makeTitleId("movie", i.movie.ids.tmdb)),
    ...shows.data.map((i) => i.show?.ids?.tmdb && makeTitleId("tv", i.show.ids.tmdb)),
  ].filter((id): id is string => Boolean(id));
  const unique = [...new Set(ids)].slice(0, 500);
  if (!unique.length) return { added: 0, total: 0 };

  const inserted = await db
    .insert(myList)
    .values(unique.map((titleId) => ({ profileId, titleId, addedAt: sql`now()` })))
    .onConflictDoNothing()
    .returning({ titleId: myList.titleId });
  return { added: inserted.length, total: unique.length };
}

export interface FinishedItem {
  titleId: string;
  season: number | null;
  episode: number | null;
}

/** Adds finished movies / episodes to the profile's Trakt history. Does nothing when not connected. */
export async function addToTraktHistory(profileId: string, items: FinishedItem[]) {
  if (!items.length) return;
  const token = await getAccessToken(profileId);
  if (!token) return;

  const watchedAt = new Date().toISOString();
  const movies: { ids: { tmdb: number }; watched_at: string }[] = [];
  const shows = new Map<number, Map<number, number[]>>();
  for (const item of items) {
    const ref = parseTitleId(item.titleId);
    if (!ref) continue;
    if (ref.media === "movie") {
      movies.push({ ids: { tmdb: ref.tmdbId }, watched_at: watchedAt });
    } else if (item.season && item.episode) {
      const seasons = shows.get(ref.tmdbId) ?? new Map<number, number[]>();
      seasons.set(item.season, [...(seasons.get(item.season) ?? []), item.episode]);
      shows.set(ref.tmdbId, seasons);
    }
  }
  if (!movies.length && !shows.size) return;

  await traktPost("/sync/history", token, {
    movies,
    shows: [...shows].map(([tmdb, seasons]) => ({
      ids: { tmdb },
      seasons: [...seasons].map(([number, episodes]) => ({
        number,
        episodes: episodes.map((ep) => ({ number: ep, watched_at: watchedAt })),
      })),
    })),
  });
}
