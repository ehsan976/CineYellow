"use client";

import { usePathname } from "next/navigation";

// Full-screen routes with their own layout: the video player, landing and sign-in pages.
const bare = ["/watch", "/welcome", "/login", "/signup"];

/** Hides the site navbar/footer on full-screen routes. */
export function SiteChrome({ children }) {
  const pathname = usePathname();
  if (bare.some((p) => pathname.startsWith(p))) return null;
  return children;
}
