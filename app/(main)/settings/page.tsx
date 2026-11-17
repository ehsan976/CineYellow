import { SettingsPage } from "@/components/account/settings-page";

export const metadata = { title: "Settings" };

export default function Settings() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <SettingsPage />
    </main>
  );
}
