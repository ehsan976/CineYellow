import { BrowsePage } from "@/components/browse/browse-page";

export const metadata = { title: "Anime" };

export default function AnimePage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <BrowsePage
        type="anime"
        heading="Anime"
        description="Action, fantasy, romance and slice-of-life — simulcasts and fan favourites in one place."
      />
    </main>
  );
}
