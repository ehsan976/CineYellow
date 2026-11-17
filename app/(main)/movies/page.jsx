import { BrowsePage } from "@/components/browse/browse-page";

export const metadata = { title: "Movies" };

export default function MoviesPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <BrowsePage
        type="movie"
        heading="Movies"
        description="Blockbusters, true stories and hidden gems — filter by genre and find tonight's movie."
      />
    </main>
  );
}
