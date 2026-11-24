"use client";

// Titles the browser already knows, for client components that only have ids: My List and
// Continue Watching (ids from the user's stores), the title popup and season switching.
// Missing titles are fetched from the /api/catalog/* route handlers (TMDB, cached on the server),
// batched, and kept for the rest of the visit. Writes only happen in the browser (effects and
// event handlers), never during server rendering.
import type { Episode, Listener, Title, TitleDetails } from "@/lib/types";
import { useEffect, useSyncExternalStore } from "react";

import { isTitleId } from "@/lib/titles";

const titles = new Map<string, Title | null>();
/** Ids whose stored Title came from the details endpoint (has rating, runtime, cast). */
const full = new Set<string>();
const details = new Map<string, TitleDetails | null>();
const seasons = new Map<string, Episode[]>();
const failed = new Set<string>();
const inflight = new Set<string>();

let version = 0;
const listeners = new Set<Listener>();

function emit() {
  version++;
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders the caller whenever the store changes. */
function useStoreVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

/** Remember titles the page already has (cards, search results…). Full titles are never replaced by summaries. */
export function rememberTitles(list: (Title | null | undefined)[], { isFull = false } = {}) {
  let changed = false;
  for (const title of list) {
    if (!title) continue;
    if (full.has(title.id) && !isFull) continue;
    titles.set(title.id, title);
    if (isFull) full.add(title.id);
    changed = true;
  }
  if (changed) emit();
}

export function getKnownTitle(id: string | null | undefined): Title | null {
  return (id && titles.get(id)) || null;
}

// ---------- Batched title loading ----------

let queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const ids = [...queue];
  queue = new Set();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    try {
      const res = await fetch(`/api/catalog/titles?ids=${encodeURIComponent(chunk.join(","))}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { titles: Record<string, Title | null> };
      for (const id of chunk) {
        const title = body.titles?.[id] ?? null;
        titles.set(id, title);
        if (title) full.add(id);
      }
    } catch {
      for (const id of chunk) failed.add(id);
    } finally {
      for (const id of chunk) inflight.delete(id);
    }
  }
  emit();
}

function requestTitles(ids: string[]) {
  for (const id of ids) {
    if (!isTitleId(id) || titles.has(id) || failed.has(id) || inflight.has(id)) continue;
    inflight.add(id);
    queue.add(id);
  }
  if (queue.size && !timer) timer = setTimeout(flush, 0);
}

/**
 * Titles for a list of ids, in the same order. Unknown ids (e.g. left over from the old mock
 * catalog) are skipped. `pending` is true while some are still loading.
 */
export function useTitles(ids: string[]) {
  useStoreVersion();
  const key = ids.join(",");
  useEffect(() => {
    if (key) requestTitles(key.split(","));
  }, [key]);
  const list = ids.map((id) => titles.get(id)).filter((t): t is Title => Boolean(t));
  const pending = ids.some((id) => isTitleId(id) && !titles.has(id) && !failed.has(id));
  return { titles: list, pending, get: (id: string) => titles.get(id) ?? null };
}

// ---------- Title details (popup) ----------

async function loadDetails(id: string) {
  const key = `details:${id}`;
  if (inflight.has(key)) return;
  inflight.add(key);
  try {
    const res = await fetch(`/api/catalog/title/${encodeURIComponent(id)}`);
    const value = res.ok ? ((await res.json()) as TitleDetails) : null;
    details.set(id, value);
    if (value) {
      rememberTitles([value.title], { isFull: true });
      rememberTitles(value.similar);
    }
  } catch {
    details.set(id, null);
  } finally {
    inflight.delete(key);
    emit();
  }
}

/** undefined while loading, null when the title doesn't exist (or couldn't be loaded). */
export function useTitleDetails(id: string | null): TitleDetails | null | undefined {
  useStoreVersion();
  useEffect(() => {
    if (id && !details.has(id)) {
      if (isTitleId(id)) loadDetails(id);
      else {
        details.set(id, null);
        emit();
      }
    }
  }, [id]);
  if (!id) return null;
  return details.get(id);
}

// ---------- Episodes (season picker) ----------

async function loadSeason(id: string, season: number) {
  const key = `${id}:${season}`;
  if (inflight.has(key)) return;
  inflight.add(key);
  try {
    const res = await fetch(`/api/catalog/title/${encodeURIComponent(id)}/season/${season}`);
    const body = res.ok ? ((await res.json()) as { episodes: Episode[] }) : { episodes: [] };
    seasons.set(key, body.episodes ?? []);
  } catch {
    seasons.set(key, []);
  } finally {
    inflight.delete(key);
    emit();
  }
}

/** One season's episodes; `initial` (rendered by the server) is used for season 1. */
export function useSeasonEpisodes(title: Title, season: number, initial?: Episode[]) {
  useStoreVersion();
  const key = `${title.id}:${season}`;
  const seeded = season === 1 && initial ? initial : undefined;
  const isShow = title.type !== "movie";
  useEffect(() => {
    if (isShow && !seeded && !seasons.has(key)) loadSeason(title.id, season);
  }, [isShow, seeded, key, title.id, season]);
  const episodes = seasons.get(key) ?? seeded;
  return { episodes: episodes ?? [], loading: isShow && !episodes };
}
