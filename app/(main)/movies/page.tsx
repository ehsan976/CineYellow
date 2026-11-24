import { discoverTitles, getBrowseGenres } from "@/lib/tmdb/catalog";
import { BrowsePage } from "@/components/browse/browse-page";

export const metadata = { title: "Movies" };

export default async function MoviesPage() {
  // First page (most popular, all genres) is cached and prerendered; filters load on the client.
  const [initial, genres] = await Promise.all([discoverTitles("movie"), getBrowseGenres("movie")]);
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <BrowsePage
        type="movie"
        heading="Movies"
        description="Blockbusters, true stories and hidden gems — filter by genre and find tonight's movie."
        initial={initial}
        genres={genres}
      />
    </main>
  );
}
