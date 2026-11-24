"use client";

// "Because you watched …" and "Top picks for {profile}" on the home page, from the active
// profile's own watch history and My List (seeds), ranked by /api/catalog/for-you.
// Nothing renders while signed out, before the profile has watched or saved anything, or on error.
import type { Listener, Title } from "@/lib/types";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { recentByTitle } from "@/lib/stores/watch-history-store";
import { rememberTitles } from "@/lib/stores/title-store";
import { useWatchHistory } from "@/hooks/use-watch-target";
import { useProfiles } from "@/hooks/use-profile";
import { useApp } from "@/components/providers/app-context";
import { Row } from "@/components/home/row";
import { LandscapeCard } from "@/components/home/landscape-card";

type ForYou = { because: { seed: Title; items: Title[] }[]; forYou: Title[] };

const SEEDS_FROM_HISTORY = 5;
const SEEDS_FROM_LIST = 3;

// ---------- Tiny per-visit store: seeds key → result (null = failed) ----------

const results = new Map<string, ForYou | null>();
const inflight = new Set<string>();
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function load(key: string) {
  if (!key || results.has(key) || inflight.has(key)) return;
  inflight.add(key);
  let value: ForYou | null = null;
  try {
    const res = await fetch(`/api/catalog/for-you?seeds=${encodeURIComponent(key)}`);
    if (res.ok) value = (await res.json()) as ForYou;
  } catch {
    // offline / aborted: show nothing
  }
  inflight.delete(key);
  results.set(key, value);
  if (value) rememberTitles([...value.forYou, ...value.because.flatMap((r) => [r.seed, ...r.items])]);
  for (const listener of listeners) listener();
}

// ---------- Rows ----------

export function PersonalRows() {
  const history = useWatchHistory();
  const { myList } = useApp();
  const { active } = useProfiles();

  // Most recently watched first, then the newest My List additions.
  const { key, exclude } = useMemo(() => {
    const watched = recentByTitle(history).map((e) => e.titleId);
    const saved: string[] = myList ?? []; // newest first
    const seeds = [...new Set([...watched.slice(0, SEEDS_FROM_HISTORY), ...saved.slice(0, SEEDS_FROM_LIST)])];
    return { key: seeds.join(","), exclude: new Set([...watched, ...saved]) };
  }, [history, myList]);

  const data = useSyncExternalStore(subscribe, () => results.get(key), () => undefined);
  useEffect(() => {
    load(key);
  }, [key]);

  if (!data) return null;
  const fresh = (items: Title[]) => items.filter((t) => !exclude.has(t.id));
  const because = data.because.map((r) => ({ ...r, items: fresh(r.items) })).filter((r) => r.items.length >= 4);
  const forYou = fresh(data.forYou);

  return (
    <>
      {forYou.length >= 4 && (
        <Row id="for-you" title={`Top Picks for ${active?.name ?? "You"}`}>
          {forYou.map((title) => (
            <LandscapeCard key={title.id} item={{ title }} />
          ))}
        </Row>
      )}
      {because.map((row) => (
        <Row key={row.seed.id} id={`because-${row.seed.id}`} title={`Because You Watched ${row.seed.title}`}>
          {row.items.map((title) => (
            <LandscapeCard key={title.id} item={{ title }} />
          ))}
        </Row>
      ))}
    </>
  );
}
