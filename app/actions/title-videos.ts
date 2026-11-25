"use server";

// Admin actions for the video links per title / episode (/admin/videos).
import { updateTag } from "next/cache";

import { ForbiddenError, UnauthorizedError, requireAdmin } from "@/lib/server/dal";
import {
  ALL_TITLE_VIDEOS_TAG,
  SourceNotFoundError,
  deleteTitleVideo,
  getSourceTitleId,
  saveTitleVideo,
  titleVideosTag,
  updateProvider,
  updateSource,
} from "@/lib/server/video-sources";
import { checkOneSource } from "@/lib/server/source-health";
import { getTitleDetails } from "@/lib/tmdb/catalog";
import { isTitleId, makeTitleId } from "@/lib/titles";
import { checkSubtitles, checkVideoUrl, providerIdFor, type VideoKind } from "@/lib/videos";

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
    if (error instanceof SourceNotFoundError) return { ok: false, error: "That link was removed meanwhile. Add it again." };
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveTitleVideoAction(input: {
  /** Set when editing an existing source; empty adds a new one. */
  id?: string | null;
  title: string;
  season?: number | string | null;
  episode?: number | string | null;
  url: string;
  label?: string;
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

    const providerId = providerIdFor(checked.kind, checked.url);
    if (!providerId) throw new InputError("That video host isn't one of the site's providers.");
    const id = input.id ? String(input.id) : null;
    if (id && !UUID.test(id)) throw new InputError("Invalid link.");
    // Editing can move a source to another title: refresh the old title's cache too.
    const previousTitleId = id ? await getSourceTitleId(id) : null;
    if (id && !previousTitleId) throw new InputError("That link was removed meanwhile. Add it again.");

    await saveTitleVideo({
      id,
      titleId,
      titleName: details.title.title,
      imdbId: details.imdbId,
      providerId,
      season,
      episode,
      kind: checked.kind,
      url: checked.url,
      label: typeof input.label === "string" ? input.label : "",
      introStart,
      introEnd,
      creditsAt: seconds(input.creditsAt, "Credits start"),
      subtitles: subs.tracks,
      adminId: admin.id,
    });
    updateTag(titleVideosTag(titleId));
    if (previousTitleId && previousTitleId !== titleId) updateTag(titleVideosTag(previousTitleId));
    updateTag(ALL_TITLE_VIDEOS_TAG);
    const where = season ? ` S${season}:E${episode}` : "";
    return `Saved ${checked.kind === "hls" ? "stream" : "embed"} for ${details.title.title}${where}`;
  });
}

export async function deleteTitleVideoAction(id: string) {
  return attempt(async () => {
    await requireAdmin();
    if (typeof id !== "string" || !UUID.test(id)) throw new InputError("Invalid link.");
    const titleId = await deleteTitleVideo(id);
    if (!titleId) throw new InputError("That link was already removed.");
    updateTag(titleVideosTag(titleId));
    updateTag(ALL_TITLE_VIDEOS_TAG);
    return "Link removed";
  });
}

/** Whole number 0..1000 (lower plays first). */
function priorityValue(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 1000) throw new InputError("Priority must be a whole number from 0 to 1000.");
  return n;
}

/** Quick change to one source: on/off, priority, label, lock. Only the fields given change. */
export async function updateSourceAction(
  id: string,
  patch: { status?: "active" | "disabled"; priority?: number | string; label?: string; locked?: boolean }
) {
  return attempt(async () => {
    await requireAdmin();
    if (typeof id !== "string" || !UUID.test(id)) throw new InputError("Invalid link.");
    const clean: Parameters<typeof updateSource>[1] = {};
    if (patch?.status !== undefined) {
      if (patch.status !== "active" && patch.status !== "disabled") throw new InputError("Invalid status.");
      clean.status = patch.status;
    }
    if (patch?.priority !== undefined) clean.priority = priorityValue(patch.priority);
    if (patch?.label !== undefined) clean.label = String(patch.label).trim().slice(0, 60);
    if (patch?.locked !== undefined) clean.locked = Boolean(patch.locked);
    if (!Object.keys(clean).length) throw new InputError("Nothing to change.");

    const titleId = await updateSource(id, clean);
    if (!titleId) throw new InputError("That link was removed meanwhile.");
    updateTag(titleVideosTag(titleId));
    updateTag(ALL_TITLE_VIDEOS_TAG);
    if (clean.status) return clean.status === "active" ? "Source turned on" : "Source turned off";
    return "Source updated";
  });
}

/** Runs the health check on one source now and records the result. */
export async function checkSourceAction(id: string) {
  return attempt(async () => {
    await requireAdmin();
    if (typeof id !== "string" || !UUID.test(id)) throw new InputError("Invalid link.");
    const result = await checkOneSource(id, updateTag);
    if (!result) throw new InputError("That link was removed meanwhile.");
    const ms = result.ms !== null ? ` (${result.ms} ms)` : "";
    if (result.outcome === "ok") {
      const extra = [
        result.maxHeight ? `${result.maxHeight}p` : "",
        result.audioLanguages?.length ? `audio: ${result.audioLanguages.join(", ")}` : "",
      ].filter(Boolean);
      return `Working${ms}${extra.length ? ` · ${extra.join(" · ")}` : ""}`;
    }
    if (result.outcome === "skipped") return result.error ? `Not checked: ${result.error}` : "This host's player can't be checked from the server";
    if (result.outcome === "advisory") throw new InputError(`Couldn't tell: ${result.error}`);
    throw new InputError(`Not working: ${result.error ?? "unknown error"}`);
  });
}

/** Turn a provider on/off or change its priority. Affects every title, so every cache refreshes. */
export async function updateProviderAction(id: string, patch: { enabled?: boolean; priority?: number | string }) {
  return attempt(async () => {
    await requireAdmin();
    if (typeof id !== "string" || !/^[a-z0-9-]{1,40}$/.test(id)) throw new InputError("Invalid provider.");
    const clean: Parameters<typeof updateProvider>[1] = {};
    if (patch?.enabled !== undefined) clean.enabled = Boolean(patch.enabled);
    if (patch?.priority !== undefined) clean.priority = priorityValue(patch.priority);
    if (!Object.keys(clean).length) throw new InputError("Nothing to change.");
    if (!(await updateProvider(id, clean))) throw new InputError("Unknown provider.");
    updateTag(ALL_TITLE_VIDEOS_TAG);
    if (clean.enabled !== undefined) return clean.enabled ? "Provider turned on" : "Provider turned off";
    return "Provider updated";
  });
}
