import { MyList } from "@/components/browse/my-list";

export const metadata = { title: "My List" };

export default function MyListPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <MyList />
    </main>
  );
}
