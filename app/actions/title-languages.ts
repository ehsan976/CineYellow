"use server";

// Admin actions for the audio/subtitle languages saved per title (/admin/languages).
// Every action re-checks the admin role in the database, then calls updateTag() so the title
// page and the admin list show the change on the next render.
import { updateTag } from "next/cache";

import { isLanguageCode, sortLanguages } from "@/lib/languages";
import { ForbiddenError, UnauthorizedError, requireAdmin } from "@/lib/server/dal";
import {
  getTitleLanguageRow,
  refetchTitleLanguages,
  saveTitleLanguages,
  setTitleLanguagesVerified,
  titleLanguagesTag,
} from "@/lib/server/title-languages";
import { getTitleDetails } from "@/lib/tmdb/catalog";
import { isTitleId, makeTitleId } from "@/lib/titles";

export type LanguageActionResult = { ok: boolean; error?: string; message?: string; titleId?: string };

async function attempt(fn: () => Promise<Omit<LanguageActionResult, "ok"> | void>): Promise<LanguageActionResult> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: "Your session has ended. Please sign in again." };
    if (error instanceof ForbiddenError) return { ok: false, error: "Admins only." };
    if (error instanceof InputError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Couldn't save. Please try again." };
  }
}

class InputError extends Error {}

function cleanCodes(list: unknown): string[] {
  if (!Array.isArray(list) || list.length > 60) throw new InputError("Too many languages.");
  const codes = list.map((c) => (typeof c === "string" ? c.trim().toLowerCase() : ""));
  if (!codes.every(isLanguageCode)) throw new InputError("Use three-letter language codes (e.g. hin, eng).");
  return sortLanguages(codes);
}

/** Title name and IMDb id for a row (from TMDB), falling back to what's saved. */
async function titleRef(titleId: string) {
  const [details, row] = await Promise.all([getTitleDetails(titleId), getTitleLanguageRow(titleId)]);
  if (!details && !row) throw new InputError("TMDB has no title with that id.");
  return { id: titleId, name: details?.title.title ?? row?.titleName ?? titleId, imdbId: details?.imdbId ?? null };
}

export async function saveTitleLanguagesAction(input: { titleId: string; audio: string[]; subtitles: string[]; verified: boolean }) {
  return attempt(async () => {
    const admin = await requireAdmin();
    if (!isTitleId(input?.titleId)) throw new InputError("Invalid title id.");
    const audio = cleanCodes(input.audio);
    const subtitles = cleanCodes(input.subtitles);
    const ref = await titleRef(input.titleId);
    await saveTitleLanguages(ref, { audio, subtitles, verified: Boolean(input.verified), adminId: admin.id });
    updateTag(titleLanguagesTag(input.titleId));
    return { message: input.verified ? "Saved and verified" : "Saved" };
  });
}

export async function setTitleLanguagesVerifiedAction(titleId: string, verified: boolean) {
  return attempt(async () => {
    const admin = await requireAdmin();
    if (!isTitleId(titleId)) throw new InputError("Invalid title id.");
    const found = await setTitleLanguagesVerified(titleId, Boolean(verified), admin.id);
    if (!found) throw new InputError("No saved languages for this title yet.");
    updateTag(titleLanguagesTag(titleId));
    return { message: verified ? "Marked as verified" : "Marked as unverified" };
  });
}

const refetchErrors: Record<string, string> = {
  disabled: "Movie of the Night isn't set up (MOTN_API_KEY).",
  auth: "Movie of the Night rejected the API key.",
  rate_limited: "Movie of the Night rate limit reached. Try again later.",
  error: "Couldn't reach Movie of the Night. Try again.",
};

export async function refetchTitleLanguagesAction(titleId: string) {
  return attempt(async () => {
    await requireAdmin();
    if (!isTitleId(titleId)) throw new InputError("Invalid title id.");
    const result = await refetchTitleLanguages(await titleRef(titleId));
    if ("reason" in result) throw new InputError(refetchErrors[result.reason] ?? refetchErrors.error);
    updateTag(titleLanguagesTag(titleId));
    if (result.kept) return { message: "Kept your verified languages. Unverify first to replace them with Movie of the Night's." };
    return { message: result.found ? "Languages fetched" : "Movie of the Night has no data for this title" };
  });
}

/** "movie-550", "tv/1399" or a themoviedb.org URL → our title id. */
function parseTitleInput(raw: string): string | null {
  const text = raw.trim();
  if (isTitleId(text)) return text;
  const m = /(?:^|themoviedb\.org\/)(movie|tv)[/-](\d{1,10})/.exec(text);
  return m ? makeTitleId(m[1] as "movie" | "tv", m[2]) : null;
}

/** Adds a title to the list: fetches its languages from Movie of the Night (or an empty row). */
export async function addTitleLanguagesAction(input: string) {
  return attempt(async () => {
    const admin = await requireAdmin();
    const titleId = typeof input === "string" ? parseTitleInput(input.slice(0, 200)) : null;
    if (!titleId) throw new InputError("Enter a TMDB id like movie-550 or tv-1399, or a themoviedb.org link.");
    const existing = await getTitleLanguageRow(titleId);
    if (existing) return { titleId, message: "Already in the list" };
    const ref = await titleRef(titleId);
    const result = await refetchTitleLanguages(ref);
    if (!result.ok) {
      // No API: start an empty row the admin fills in by hand.
      await saveTitleLanguages(ref, { audio: [], subtitles: [], verified: false, adminId: admin.id });
    }
    updateTag(titleLanguagesTag(titleId));
    return { titleId, message: result.ok ? `Added ${ref.name}` : `Added ${ref.name} — enter its languages by hand` };
  });
}
