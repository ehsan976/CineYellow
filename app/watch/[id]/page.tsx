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
import type { WatchOption } from "@/lib/types";
import { getAvailableTitleIds, getVideoSources } from "@/lib/server/title-videos";
import { NotOnCineYellow } from "@/components/watch/not-on-cineyellow";
import { NetflixPlayer } from "@/components/player/netflix-player";
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

async function WatchContent({ params, searchParams }: WatchProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const title = await getTitle(id);
  if (!title) notFound();
  const demo = await getPlayback(title, query.s, query.e, getEpisodes);

  // The admin-added video for this title / episode (read at request time, never at build).
  await connection();

  // Paid access is checked here, on the server, before any video link is read: without it the
  // page never contains a stream or embed URL (hiding the player in the browser isn't enough).
  const [access, availableIds] = await Promise.all([getWatchAccess(), getAvailableTitleIds()]);
  if (access.reason === "signed-out") redirect(`/login?next=${encodeURIComponent(`/watch/${id}`)}`);

  // No video on CineYellow for this title at all: say so (and where it's legally streaming)
  // before anything about plans, since paying wouldn't help. Admins get the demo to test with.
  const notHere = async (episodeOnly: boolean) => (
    <NotOnCineYellow title={title} providers={(await getTitleDetails(id))?.watchProviders ?? null} episodeOnly={episodeOnly} />
  );
  if (!availableIds.includes(id) && !access.isAdmin) return notHere(false);

  if (!access.allowed) return <PlanRequired title={title} pendingPayment={access.pendingPayment} />;

  const sources = await getVideoSources(title.id, demo.season, demo.episode);
  // The show has videos, just not this episode (and no whole-show link).
  if (!sources.length && !access.isAdmin) return notHere(true);
  // Admin preview of a title without videos: the demo stream in the site player.
  if (!sources.length) {
    return (
      <KidsGate title={title}>
        <NetflixPlayer key={demo.key} title={title} playback={demo} />
      </KidsGate>
    );
  }

  // Anime with no admin-set intro/credits times on some HLS source: try AniSkip's community times.
  const needsTimes = sources.some((s) => s.kind === "hls" && (s.introStart === null || s.creditsAt === null));
  const details = needsTimes ? await getTitleDetails(id) : null;
  const auto = details ? await getAutoSkipTimes(details, demo.season, demo.episode) : null;

  // Every source, best first: the client starts with the first and falls back down the list.
  const options: WatchOption[] = sources.map((s, i) => ({
    id: s.id,
    kind: s.kind,
    name: s.label ? `${s.label} · ${s.providerName}` : `Server ${i + 1} · ${s.providerName}`,
    providerId: s.providerId,
    ...(s.kind === "hls" ? { playback: withVideoSource(demo, s, title, auto) } : { embedUrl: s.url }),
  }));
  // key: a new episode remounts everything
  // Kids profiles only play titles rated All / 7+ (a parental guard on the same paid account,
  // checked in the browser where the active profile is known).
  return (
    <KidsGate title={title}>
      <WatchSources key={demo.key} title={title} playback={demo} options={options} />
    </KidsGate>
  );
}
