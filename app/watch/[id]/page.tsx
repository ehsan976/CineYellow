import type { Metadata } from "next";

type WatchProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { getEpisodes, getTitle, getTitleDetails } from "@/lib/tmdb/catalog";
import { getAutoSkipTimes } from "@/lib/anilist/aniskip";
import { getPrerenderIds } from "@/lib/tmdb/home";
import { getPlayback, withVideoSource } from "@/lib/player/playback";
import type { ServerLanguage, WatchOption } from "@/lib/types";
import { getAvailableTitleIds, getVideoSources } from "@/lib/server/video-sources";
import { getEmbedServerStates } from "@/lib/server/embed-health";
import { getEmbedWatchOptions } from "@/lib/player/embed-providers";
import { WatchSources } from "@/components/watch/watch-sources";
import { KidsGate } from "@/components/watch/kids-gate";
import { PlanRequired } from "@/components/watch/plan-required";
import { getWatchAccess } from "@/lib/server/dal";

// Today's trending titles are prerendered; any other title renders on its first visit.
export async function generateStaticParams() {
  return (await getPrerenderIds(5)).map((id) => ({ id }));
}

export async function generateMetadata({ params }: Pick<WatchProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const title = await getTitle(id);
  return { title: title ? `Watching ${title.title}` : "Title not found" };
}

// URL data (params, ?s=&e=) is read only inside Suspense so the App Shell stays shared.
export default function WatchPage({ params, searchParams }: WatchProps) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <WatchContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const serverLanguageFor = (label: string, providerName: string): ServerLanguage =>
  /\bhindi\b|\burdu\b|\bhin\b|\bbollywood\b/i.test(`${label} ${providerName}`) ? "hindi" : "english";

async function WatchContent({ params, searchParams }: WatchProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const details = await getTitleDetails(id);
  const title = details?.title ?? (await getTitle(id));
  if (!title) notFound();
  const demo = await getPlayback(title, query.s, query.e, getEpisodes);

  // The admin-added video for this title / episode (read at request time, never at build).
  await connection();

  // Paid access is checked here, on the server, before any video link is read.
  const access = await getWatchAccess();
  if (access.reason === "signed-out") redirect(`/login?next=${encodeURIComponent(`/watch/${id}`)}`);

  if (!access.allowed && !access.isAdmin) return <PlanRequired title={title} pendingPayment={access.pendingPayment} />;

  // 1. Admin/Database configured sources + live embed server health states
  const [sources, embedStates] = await Promise.all([
    getVideoSources(title.id, demo.season, demo.episode),
    getEmbedServerStates(),
  ]);

  // Anime auto-skip times for HLS sources
  const needsTimes = sources.some((s) => s.kind === "hls" && (s.introStart === null || s.creditsAt === null));
  const auto = needsTimes && details ? await getAutoSkipTimes(details, demo.season, demo.episode) : null;

  const dbOptions: WatchOption[] = sources.map((s, i) => ({
    id: s.id,
    kind: s.kind,
    name: s.label ? `${s.label} · ${s.providerName}` : `Server ${i + 1} · ${s.providerName}`,
    providerId: s.providerId,
    language: serverLanguageFor(s.label, s.providerName),
    ...(s.kind === "hls" ? { playback: withVideoSource(demo, s, title, auto) } : { embedUrl: s.url }),
  }));

  // 2. Embed providers grouped into English (VidRift first) and Hindi servers, with live health & mirror fallback
  const embedOptions = getEmbedWatchOptions({
    titleId: title.id,
    season: demo.season,
    episode: demo.episode,
    imdbId: details?.imdbId ?? null,
    states: embedStates,
  });

  const options: WatchOption[] = [...dbOptions, ...embedOptions];

  // Kids profiles only play titles rated All / 7+ (parental guard on paid account).
  return (
    <KidsGate title={title}>
      <WatchSources key={demo.key} title={title} playback={demo} options={options} />
    </KidsGate>
  );
}
