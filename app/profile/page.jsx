import { ProfilePage } from "@/components/site/profile-page";

export const metadata = { title: "Profile" };

export default function Profile() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      <ProfilePage />
    </main>
  );
}
