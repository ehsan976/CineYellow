import { BrowsePage } from "@/components/site/browse-page";

export const metadata = { title: "Series" };

export default function SeriesPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <BrowsePage
        type="series"
        heading="Series"
        description="Binge-worthy thrillers, comedies and dramas, with new episodes every week."
      />
    </main>
  );
}
