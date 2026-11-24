// Static site navigation. Titles, rows and notifications come from TMDB (lib/tmdb).
import type { NavLink } from "@/lib/types";

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Movies", href: "/movies" },
  { label: "Series", href: "/series" },
  { label: "Anime", href: "/anime" },
  { label: "My List", href: "/my-list" },
];
