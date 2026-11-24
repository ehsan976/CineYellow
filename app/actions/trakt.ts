"use server";

// Trakt actions for the account page. Linking itself is a redirect flow (/api/trakt/connect).
import { UnauthorizedError, requireProfile } from "@/lib/server/dal";
import { deleteTraktConnection, importTraktWatchlist } from "@/lib/server/trakt";

export type TraktActionResult = { ok: boolean; error?: string; message?: string };

async function attempt(fn: () => Promise<string>): Promise<TraktActionResult> {
  try {
    return { ok: true, message: await fn() };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: "Your session has ended. Please sign in again." };
    if (error instanceof TraktError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

class TraktError extends Error {}

export async function disconnectTraktAction(profileId: string) {
  return attempt(async () => {
    const { profileId: id } = await requireProfile(profileId);
    await deleteTraktConnection(id);
    return "Trakt disconnected";
  });
}

/** Copies the profile's Trakt watchlist into its My List. */
export async function importTraktWatchlistAction(profileId: string) {
  return attempt(async () => {
    const { profileId: id } = await requireProfile(profileId);
    const result = await importTraktWatchlist(id);
    if (!result) throw new TraktError("Couldn't reach Trakt. Reconnect your account and try again.");
    if (!result.total) return "Your Trakt watchlist is empty";
    return result.added
      ? `Added ${result.added} title${result.added === 1 ? "" : "s"} to My List`
      : "Everything on your Trakt watchlist is already in My List";
  });
}
