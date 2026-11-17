import { AccountPage } from "@/components/site/account-page";

export const metadata = { title: "Account" };

export default function Account() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <AccountPage />
    </main>
  );
}
