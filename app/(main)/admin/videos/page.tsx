import { Suspense } from "react";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/server/dal";
import { listTitleVideos } from "@/lib/server/title-videos";
import { PageHeading } from "@/components/account/settings-ui";
import { AdminNav } from "@/components/admin/admin-nav";
import { TitleVideosAdmin } from "@/components/admin/title-videos-admin";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Admin · Videos" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function VideosAdminPage({ searchParams }: Props) {
  return (
    <main className="mx-auto max-w-[1200px] px-4 pt-24 pb-8 md:px-10">
      <PageHeading
        title="Admin"
        description="Attach the video for a movie or an episode: an HLS stream (.m3u8) plays in the site's player; a YouTube, Vimeo, Bunny, Cloudflare, Mux or Dailymotion link shows that host's player. Titles without a link play the demo video."
      />
      <AdminNav />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <VideosContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function VideosContent({ searchParams }: Props) {
  // proxy.ts already keeps non-admins out of /admin; this re-checks the role in the database.
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }
  const params = await searchParams;
  const q = first(params.q).slice(0, 100);
  const page = Math.min(Math.max(1, Number.parseInt(first(params.page), 10) || 1), 1000);
  const data = await listTitleVideos({ q, page });
  return <TitleVideosAdmin {...data} q={q} />;
}
