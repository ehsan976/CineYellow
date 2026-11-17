import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getTitle, titles } from "@/lib/data/catalog";
import { getPlayback } from "@/lib/playback";
import { NetflixPlayer } from "@/components/player/netflix-player";

export function generateStaticParams() {
  return titles.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const title = getTitle(id);
  return { title: title ? `Watching ${title.title}` : "Title not found" };
}

// URL data (params, ?s=&e=) is read only inside Suspense so the App Shell stays shared.
export default function WatchPage({ params, searchParams }) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <WatchContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function WatchContent({ params, searchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const title = getTitle(id);
  if (!title) notFound();
  const playback = getPlayback(title, query.s, query.e);
  // key: a new episode remounts the player (every episode shares one demo stream)
  return <NetflixPlayer key={playback.key} title={title} playback={playback} />;
}
