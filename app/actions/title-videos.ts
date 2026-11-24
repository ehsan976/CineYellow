"use server";

// Admin actions for the video links per title / episode (/admin/videos).
import { updateTag } from "next/cache";

import { ForbiddenError, UnauthorizedError, requireAdmin } from "@/lib/server/dal";
import { ALL_TITLE_VIDEOS_TAG, deleteTitleVideo, saveTitleVideo, titleVideosTag } from "@/lib/server/title-videos";
import { getTitleDetails } from "@/lib/tmdb/catalog";
import { isTitleId, makeTitleId } from "@/lib/titles";
import { checkSubtitles, checkVideoUrl, type VideoKind } from "@/lib/videos";

export type VideoActionResult = { ok: boolean; error?: string; message?: string };

class InputError extends Error {}

async function attempt(fn: () => Promise<string | void>): Promise<VideoActionResult> {
  try {
    const message = await fn();
    return { ok: true, ...(message ? { message } : {}) };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: "Your session has ended. Please sign in again." };
    if (error instanceof ForbiddenError) return { ok: false, error: "Admins only." };
    if (error instanceof InputError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Couldn't save. Please try again." };
  }
}

/** "movie-550", "tv/1399" or a themoviedb.org link → our title id. */
function parseTitleInput(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim().slice(0, 200);
  if (isTitleId(text)) return text;
  const m = /(?:^|themoviedb\.org\/)(movie|tv)[/-](\d{1,10})/.exec(text);
  return m ? makeTitleId(m[1] as "movie" | "tv", m[2]) : null;
}

/** Whole seconds 0..86400, or null when empty. */
function seconds(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 86400) throw new InputError(`${label} must be whole seconds.`);
  return n;
}

function positive(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 1000) throw new InputError(`${label} must be a number from 1.`);
  return n;
}

export async function saveTitleVideoAction(input: {
  title: string;
  season?: number | string | null;
  episode?: number | string | null;
  url: string;
  kind?: VideoKind | "auto";
  introStart?: number | string | null;
  introEnd?: number | string | null;
  creditsAt?: number | string | null;
  subtitles?: { lang?: string; label?: string; url?: string }[];
}) {
  return attempt(async () => {
    const admin = await requireAdmin();
    const titleId = parseTitleInput(input?.title);
    if (!titleId) throw new InputError("Enter a TMDB id like movie-550 or tv-1399, or a themoviedb.org link.");
    const details = await getTitleDetails(titleId);
    if (!details) throw new InputError("TMDB has no title with that id.");

    const isMovie = details.title.type === "movie";
    const season = isMovie ? null : positive(input.season, "Season");
    const episode = isMovie ? null : positive(input.episode, "Episode");
    if ((season === null) !== (episode === null)) throw new InputError("Give both season and episode, or neither (whole show).");

    const kind = input.kind === "hls" || input.kind === "embed" ? input.kind : undefined;
    const checked = checkVideoUrl(String(input.url ?? ""), kind);
    if (!checked.ok) throw new InputError(checked.error);

    const introStart = seconds(input.introStart, "Intro start");
    const introEnd = seconds(input.introEnd, "Intro end");
    if ((introStart === null) !== (introEnd === null)) throw new InputError("Give both intro start and end, or neither.");
    if (introStart !== null && introEnd <= introStart) throw new InputError("Intro end must be after intro start.");

    // Subtitle files play in the site's own player only (an embed host shows its own captions).
    const subs = checkSubtitles(input.subtitles);
    if (!subs.ok) throw new InputError(subs.error);
    if (subs.tracks.length && checked.kind !== "hls") throw new InputError("Subtitle files work with .m3u8 streams only; embed hosts use their own captions.");

    await saveTitleVideo({
      titleId,
      titleName: details.title.title,
      season,
      episode,
      kind: checked.kind,
      url: checked.url,
      introStart,
      introEnd,
      creditsAt: seconds(input.creditsAt, "Credits start"),
      subtitles: subs.tracks,
      adminId: admin.id,
    });
    updateTag(titleVideosTag(titleId));
    updateTag(ALL_TITLE_VIDEOS_TAG);
    const where = season ? ` S${season}:E${episode}` : "";
    return `Saved ${checked.kind === "hls" ? "stream" : "embed"} for ${details.title.title}${where}`;
  });
}

export async function deleteTitleVideoAction(key: string) {
  return attempt(async () => {
    await requireAdmin();
    if (typeof key !== "string" || key.length > 80) throw new InputError("Invalid link.");
    const titleId = await deleteTitleVideo(key);
    if (!titleId) throw new InputError("That link was already removed.");
    updateTag(titleVideosTag(titleId));
    updateTag(ALL_TITLE_VIDEOS_TAG);
    return "Link removed";
  });
}
