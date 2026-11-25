import type { Metadata } from "next";

type TitleParams = { params: Promise<{ id: string }> };

import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getEpisodes, getTitleDetails } from "@/lib/tmdb/catalog";
import { getPrerenderIds } from "@/lib/tmdb/home";
import { getAvailableTitleIds } from "@/lib/server/video-sources";
import { typeLabels } from "@/lib/titles";
import { TitleSkeleton } from "@/components/title/title-skeleton";
import { TitleView } from "@/components/title/title-view";

// Today's trending titles are prerendered at build time; any other title renders on its first visit.
export async function generateStaticParams() {
  return (await getPrerenderIds(20)).map((id) => ({ id }));
}

export async function generateMetadata({ params }: TitleParams): Promise<Metadata> {
  const { id } = await params;
  const title = (await getTitleDetails(id))?.title;
  if (!title) return { title: "Title not found" };
  const heading = title.year ? `${title.title} (${title.year})` : title.title;
  return {
    title: heading,
    description: title.description,
    openGraph: {
      title: `${heading} · ${typeLabels[title.type]}`,
      description: title.description,
      images: [{ url: title.backdrop, width: 1280, height: 720 }],
    },
  };
}

// The page itself never awaits `params`: the shared App Shell stays URL-independent
// (so navigation is instant), and only <TitleContent> reads the URL, inside Suspense.
export default function TitlePage({ params }: TitleParams) {
  return (
    <Suspense fallback={<TitleSkeleton />}>
      <TitleContent params={params} />
    </Suspense>
  );
}

async function TitleContent({ params }: TitleParams) {
  const { id } = await params;
  const [details, availableIds] = await Promise.all([getTitleDetails(id), getAvailableTitleIds()]);
  if (!details) notFound();
  const initialEpisodes = details.title.type !== "movie" ? await getEpisodes(details.title, 1) : undefined;
  return <TitleView details={{ ...details, available: availableIds.includes(id) }} initialEpisodes={initialEpisodes} />;
}
