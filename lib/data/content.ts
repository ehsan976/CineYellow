// Homepage layout: which catalog titles appear in which row.
// Every item points at a title in lib/data/catalog.ts by `titleId`.
import type { AppNotification, ContinueItem, FeaturedItem, NavLink, Row } from "@/lib/types";


export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Movies", href: "/movies" },
  { label: "Series", href: "/series" },
  { label: "Anime", href: "/anime" },
  { label: "My List", href: "/my-list" },
];

export const featured: FeaturedItem[] = [
  { titleId: "last-horizon", tagline: "A daring expedition. A hidden world. The journey changes everything." },
  { titleId: "city-of-echoes", tagline: "Every street remembers. One detective is about to listen." },
  { titleId: "rogue-planet", tagline: "Lost between stars, the crew must choose who comes home." },
];

// Demo items shown after the viewer's real watch history.
export const continueWatching: ContinueItem[] = [
  { titleId: "last-horizon", info: "1h 12m left", progress: 45 },
  { titleId: "city-of-echoes", season: 1, episode: 3, info: "S1:E3 · 28m left", progress: 60 },
  { titleId: "under-neon-skies", info: "42m left", progress: 30 },
  { titleId: "silent-truth", season: 1, episode: 5, info: "S1:E5 · 15m left", progress: 80 },
  { titleId: "midnight-letters", info: "55m left", progress: 20 },
  { titleId: "rogue-planet", info: "1h 02m left", progress: 35 },
  { titleId: "northern-lights", season: 2, episode: 1, info: "S2:E1 · 40m left", progress: 10 },
];

// Section 1: first three landscape rows
export const topRows: Row[] = [
  {
    id: "new",
    href: "/series",
    title: "New on CineYellow",
    items: [
      { titleId: "comedy-hour", badge: "New Episode", watchNow: true },
      { titleId: "cursed-temple", badge: "New Episode", watchNow: true },
      { titleId: "circle-of-fate", badge: "Recently added" },
      { titleId: "warrior-king", badge: "Recently added" },
      { titleId: "little-hero", badge: "Recently added" },
      { titleId: "night-drive" },
      { titleId: "frozen-peaks" },
    ],
  },
  {
    id: "real-life",
    href: "/movies",
    title: "Movies Based on Real Life",
    items: [
      { titleId: "dust-road", badge: "Recently added" },
      { titleId: "final-over" },
      { titleId: "silent-signal" },
      { titleId: "champion" },
      { titleId: "full-throttle", badge: "Leaving Soon" },
      { titleId: "ocean-bound" },
    ],
  },
  {
    id: "adventure",
    href: "/movies",
    title: "Once Upon a Time",
    items: [
      { titleId: "old-kingdom" },
      { titleId: "whispers-woods", badge: "New Season" },
      { titleId: "paradise-lost" },
      { titleId: "skyward", badge: "Recently added" },
      { titleId: "legends-of-fire" },
      { titleId: "jungle-world" },
    ],
  },
];

// Section 2: two "Trending" Top 10 rows
export const trendingRows: Row[] = [
  {
    id: "top-series",
    href: "/series",
    title: "Top 10 Series Today",
    items: [
      { titleId: "ember", badge: "Recently added" },
      { titleId: "cursed-temple", badge: "New Episode", watchNow: true },
      { titleId: "comedy-hour", badge: "New Episode", watchNow: true },
      { titleId: "dead-end-job", badge: "Recently added" },
      { titleId: "neon-hearts", badge: "Recently added" },
      { titleId: "city-of-echoes" },
      { titleId: "silent-truth" },
      { titleId: "northern-lights" },
      { titleId: "faces" },
      { titleId: "wild-hearts" },
    ],
  },
  {
    id: "top-movies",
    href: "/movies",
    title: "Top 10 Movies Today",
    items: [
      { titleId: "festival-of-lights", badge: "Recently added" },
      { titleId: "the-village", badge: "Recently added" },
      { titleId: "strange-night", badge: "Recently added" },
      { titleId: "jungle-world", badge: "Recently added" },
      { titleId: "dont-trouble-trouble", badge: "Recently added" },
      { titleId: "rogue-planet" },
      { titleId: "last-horizon" },
      { titleId: "midnight-letters" },
      { titleId: "under-neon-skies" },
      { titleId: "the-breach" },
    ],
  },
];

// Section 3: remaining landscape rows
export const moreRows: Row[] = [
  {
    id: "buddy",
    href: "/movies",
    title: "Buddy Movies",
    items: [
      { titleId: "life-once-more" },
      { titleId: "lost-ladies" },
      { titleId: "total-chaos-3", badge: "Recently added" },
      { titleId: "the-return", badge: "Recently added" },
      { titleId: "village-tales" },
      { titleId: "festival-of-lights" },
    ],
  },
  {
    id: "originals",
    href: "/series",
    title: "Only on CineYellow",
    items: [
      { titleId: "strange-night", badge: "Recently added" },
      { titleId: "the-investigator", badge: "Recently added" },
      { titleId: "last-element", badge: "New Season" },
      { titleId: "love-in-paris" },
      { titleId: "sweet-summer", badge: "New Season" },
      { titleId: "code-red" },
    ],
  },
  {
    id: "regional",
    href: "/movies",
    title: "Tamil-Language Movies",
    items: [
      { titleId: "sail-away" },
      { titleId: "dorothy" },
      { titleId: "sigma" },
      { titleId: "window-seat" },
      { titleId: "blast", badge: "Leaving Soon" },
      { titleId: "cinema-hall" },
    ],
  },
  {
    id: "anime",
    href: "/anime",
    title: "Anime",
    items: [
      { titleId: "neon-ronin", badge: "New Episode", watchNow: true },
      { titleId: "akiba-nights", badge: "Simulcast" },
      { titleId: "spirit-of-fuji", badge: "New Season" },
      { titleId: "sakura-promise" },
      { titleId: "temple-guardians", badge: "Recently added" },
      { titleId: "tokyo-drift-zero" },
      { titleId: "lanterns-of-kyoto", badge: "New Episode", watchNow: true },
      { titleId: "city-of-rain" },
    ],
  },
];

// Navbar bell: newest first. `unread` marks the initial unread state.
export const notifications: AppNotification[] = [
  { id: "n1", titleId: "neon-ronin", label: "New Episode", detail: "Season 2 · Episode 4 is out now", time: "2h ago", unread: true },
  { id: "n2", titleId: "comedy-hour", label: "New Episode", detail: "This week's show just dropped", time: "5h ago", unread: true },
  { id: "n3", titleId: "whispers-woods", label: "New Season", detail: "Season 3 is now streaming", time: "Yesterday", unread: true },
  { id: "n4", titleId: "last-horizon", label: "Leaving Soon", detail: "Watch before it leaves on Dec 1", time: "2 days ago", unread: false },
  { id: "n5", titleId: "spirit-of-fuji", label: "Now Available", detail: "All 3 seasons, subbed and dubbed", time: "3 days ago", unread: false },
  { id: "n6", titleId: "ember", label: "Trending", detail: "#1 in Series today", time: "4 days ago", unread: false },
];
