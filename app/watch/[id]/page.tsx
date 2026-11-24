import type { Metadata } from "next";

type WatchProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getEpisodes, getTitle, getTitleDetails } from "@/lib/tmdb/catalog";
import { getAutoSkipTimes } from "@/lib/anilist/aniskip";
import { getPrerenderIds } from "@/lib/tmdb/home";
import { getPlayback, withVideoSource } from "@/lib/player/playback";
import { getVideoSource } from "@/lib/server/title-videos";
import { NetflixPlayer } from "@/components/player/netflix-player";
import { EmbedWatch } from "@/components/watch/embed-watch";

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
  const source = await getVideoSource(title.id, demo.season, demo.episode);
  if (source?.kind === "embed") return <EmbedWatch title={title} playback={demo} url={source.url} />;

  // Anime with no admin-set intro/credits times: try AniSkip's community times.
  const needsTimes = source?.kind === "hls" && (source.introStart === null || source.creditsAt === null);
  const details = needsTimes ? await getTitleDetails(id) : null;
  const auto = details ? await getAutoSkipTimes(details, demo.season, demo.episode) : null;

  // No link yet → the demo stream; an HLS link → the same player with that stream.
  const playback = withVideoSource(demo, source, title, auto);
  // key: a new episode remounts the player
  return <NetflixPlayer key={playback.key} title={title} playback={playback} />;
}
