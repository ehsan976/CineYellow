import { HelpPage } from "@/components/account/help-page";

export const metadata = { title: "Help Center" };

export default function Help() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <HelpPage />
    </main>
  );
}
