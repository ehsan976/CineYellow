import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getTitle, titles, typeLabels } from "@/lib/data/catalog";
import { TitleSkeleton } from "@/components/title/title-skeleton";
import { TitleView } from "@/components/title/title-view";

// Prerender every title page at build time.
export function generateStaticParams() {
  return titles.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const title = getTitle(id);
  if (!title) return { title: "Title not found" };
  const heading = `${title.title} (${title.year})`;
  return {
    title: heading,
    description: title.description,
    openGraph: {
      title: `${heading} · ${typeLabels[title.type]}`,
      description: title.description,
      images: [{ url: title.backdrop, width: 1920, height: 1080 }],
    },
  };
}

// The page itself never awaits `params`: the shared App Shell stays URL-independent
// (so navigation is instant), and only <TitleContent> reads the URL, inside Suspense.
export default function TitlePage({ params }) {
  return (
    <Suspense fallback={<TitleSkeleton />}>
      <TitleContent params={params} />
    </Suspense>
  );
}

async function TitleContent({ params }) {
  const { id } = await params;
  const title = getTitle(id);
  if (!title) notFound();
  return <TitleView title={title} />;
}
