import type { ReactNode } from "react";
import { getNotifications } from "@/lib/tmdb/home";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/** Layout for the signed-in site: navbar on top, footer at the bottom. */
export default async function MainLayout({ children }: { children: ReactNode }) {
  // What's new this week, from TMDB (cached for hours, part of the static shell).
  const notifications = await getNotifications();
  return (
    <>
      <Navbar notifications={notifications} />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}
