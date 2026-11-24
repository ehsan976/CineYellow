import { discoverTitles, getBrowseGenres } from "@/lib/tmdb/catalog";
import { BrowsePage } from "@/components/browse/browse-page";

export const metadata = { title: "Series" };

export default async function SeriesPage() {
  // First page (most popular, all genres) is cached and prerendered; filters load on the client.
  const [initial, genres] = await Promise.all([discoverTitles("series"), getBrowseGenres("series")]);
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <BrowsePage
        type="series"
        heading="Series"
        description="Binge-worthy thrillers, comedies and dramas, with new episodes every week."
        initial={initial}
        genres={genres}
      />
    </main>
  );
}
