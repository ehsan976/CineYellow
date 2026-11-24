import { discoverTitles, getBrowseGenres } from "@/lib/tmdb/catalog";
import { BrowsePage } from "@/components/browse/browse-page";

export const metadata = { title: "Anime" };

export default async function AnimePage() {
  // First page (most popular, all genres) is cached and prerendered; filters load on the client.
  const [initial, genres] = await Promise.all([discoverTitles("anime"), getBrowseGenres("anime")]);
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <BrowsePage
        type="anime"
        heading="Anime"
        description="Action, fantasy, romance and slice-of-life — simulcasts and fan favourites in one place."
        initial={initial}
        genres={genres}
      />
    </main>
  );
}
