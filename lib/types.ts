// Shared data types for the whole site. Titles and episodes come from TMDB (lib/tmdb/map.ts maps
// its responses to these); audio/subtitle languages come from Movie of the Night via Postgres.

export type TitleType = "movie" | "series" | "anime";

export interface Title {
  /** "movie-<TMDB id>" or "tv-<TMDB id>" (lib/titles.ts parseTitleId). */
  id: string;
  title: string;
  type: TitleType;
  genres: string[];
  year: number;
  /** Maturity label ("13+", "18+", "NR"); "" when unknown (list results). */
  rating: string;
  /** Runtime like "2h 14m" (movies only; null in list results). */
  duration: string | null;
  /** Number of seasons (series/anime only; null in list results). */
  seasons: number | null;
  /** TMDB image path the images were built from. */
  imageId: string;
  /** Landscape (16:9) image for cards. */
  image: string;
  poster: string;
  backdrop: string;
  description: string;
  cast: string[];
  /** "% Match" shown in the UI. */
  match: number;
  popularity: number;
}

export interface Episode {
  id: string;
  number: number;
  name: string;
  runtime: string;
  image: string;
  summary: string;
}

/** Everything the title page and popup need beyond the card data. */
export interface TitleDetails {
  title: Title;
  similar: Title[];
  imdbId: string | null;
  /** TMDB tagline ("" when it has none). */
  tagline: string;
  /** Official trailer on YouTube (from TMDB), if there is one. */
  trailer: Trailer | null;
  /** Name in the original language (Japanese for anime); "" when TMDB has none. */
  originalTitle: string;
  /** Japanese animation, films included (those keep type "movie"). Gets AniList details. */
  isAnime: boolean;
  /** Streaming services carrying it in the site's region (TMDB / JustWatch); null when none. */
  watchProviders: WatchProviders | null;
  /** Episodes per season (index 0 = season 1), for shows; [] for movies. */
  seasonEpisodeCounts: number[];
}

export interface WatchProvider {
  id: number;
  name: string;
  logo: string;
}

/** Where a title can be watched legally in one country. */
export interface WatchProviders {
  /** TMDB's "Where to watch" page, which links on to each service. */
  link: string;
  region: string;
  stream: WatchProvider[];
  /** Free, including free with ads. */
  free: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

/** Anime details from AniList (lib/anilist/anime.ts), matched to a TMDB title. */
export interface AnimeInfo {
  anilistId: number;
  malId: number | null;
  /** AniList average score, 0–100; null when not enough votes. */
  score: number | null;
  studios: string[];
  /** "Manga", "Light Novel", "Original", … ("" when unknown). */
  source: string;
  /** First season's premiere, e.g. "Fall 2024" ("" when unknown). */
  season: string;
  /** "Airing", "Finished", "Upcoming", "On hiatus" or "Cancelled". */
  status: string;
  /** Episodes of the matched entry (season 1 for shows); null while unknown. */
  episodes: number | null;
  /** The next episode of the currently airing season. */
  nextEpisode: { number: number; airingAt: number } | null;
  anilistUrl: string;
  malUrl: string | null;
  /** AniList's TV seasons in order (season 1 first; just the film for movies). */
  seasons: AnimeSeason[];
}

export interface AnimeSeason {
  anilistId: number;
  malId: number | null;
  /** null while airing with no announced total. */
  episodes: number | null;
  /** false for an announced season that hasn't started. */
  released: boolean;
}

/**
 * Opening / ending times for one episode (seconds), from AniSkip. Each comes with the length of
 * the video it was measured on: the player only uses it when its own video is that long.
 */
export interface SkipTimes {
  intro: { start: number; end: number; length: number } | null;
  /** When the ending starts. */
  credits: { at: number; length: number } | null;
}

export interface Trailer {
  /** YouTube video id. */
  key: string;
  name: string;
}

/**
 * Where a title or episode's video comes from (added by an admin, table title_video):
 * "hls" plays in the site's own player, "embed" shows the host's player in an iframe.
 */
export interface VideoSource {
  kind: "hls" | "embed";
  url: string;
  /** Seconds; null = no "Skip Intro" button. */
  introStart: number | null;
  introEnd: number | null;
  /** When the end credits start (shows "Next episode"); null = only at the end. */
  creditsAt: number | null;
  /** WebVTT subtitle files (HLS videos only; embeds use their host's captions). */
  subtitles: SubtitleTrack[];
}

/** One subtitle file for a video. */
export interface SubtitleTrack {
  /** ISO 639 code, e.g. "en", "ur", "hin". */
  lang: string;
  /** Shown in the player menu, e.g. "English". */
  label: string;
  /** https URL of a .vtt file (its host must allow CORS). */
  url: string;
}

/** One page of a browse grid. */
export interface CatalogPage {
  items: Title[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface GenreOption {
  /** Sent back to the server ("all" or a genre key). */
  value: string;
  label: string;
}

export type BrowseSort = "popular" | "newest" | "rating" | "az";

export type LanguageStatus = "unverified" | "verified";

/** Audio / subtitle languages of one title (ISO 639-2 codes), from the title_language table. */
export interface TitleLanguages {
  titleId: string;
  audio: string[];
  subtitles: string[];
  status: LanguageStatus;
  /** True when Movie of the Night had no data for the title. */
  notFound: boolean;
}

/** A card in a homepage row. */
export interface RowItem {
  title: Title;
  badge?: string;
  watchNow?: boolean;
}

export interface Row {
  id: string;
  title: string;
  href?: string;
  items: RowItem[];
}

export interface FeaturedItem {
  title: Title;
  tagline: string;
}

export interface ContinueItem {
  titleId: string;
  season?: number;
  episode?: number;
  info: string;
  progress: number;
  href?: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface AppNotification {
  id: string;
  title: Title;
  label: string;
  detail: string;
  time: string;
  unread: boolean;
}

export interface NextEpisode {
  season: number;
  episode: number;
  data: Episode;
  href: string;
}

/** What the player plays for one title / episode (lib/player/playback.ts). */
export interface Playback {
  titleId: string;
  src: string;
  storyboard: string;
  poster: string;
  credit: string;
  intro: { start: number; end: number };
  creditsAt: number;
  /**
   * Set when intro / credits came from AniSkip instead of an admin: the length of the video they
   * were measured on. The player ignores them unless its video is that long (useSkipMarkers).
   */
  introLength?: number | null;
  creditsLength?: number | null;
  /** Subtitle files attached to the video in admin (WebVTT). */
  subtitles?: SubtitleTrack[];
  /** "title" for movies, "title:s1e3" for episodes — the resume key. */
  key: string;
  season: number | null;
  episode: number | null;
  current?: Episode;
  label: string | null;
  episodes: Episode[];
  next: NextEpisode | null;
}

export interface HistoryEntry {
  key: string;
  titleId: string;
  season: number | null;
  episode: number | null;
  time: number;
  duration: number;
  updatedAt: number;
}

export type AvatarColor = "yellow" | "sky" | "emerald" | "rose" | "violet" | "orange";

export interface Profile {
  id: string;
  name: string;
  color: AvatarColor;
  kids: boolean;
  language: string;
}

export type PlanId = "basic" | "standard" | "premium";

export interface Plan {
  name: string;
  price: string;
  quality: string;
  screens: number;
}

export type PaymentProvider = "safepay";

/** Plan time bought through Safepay (from the latest paid row in the `payment` table). */
export interface AccessInfo {
  plan: PlanId;
  /** ISO date the paid time ends. */
  until: string;
  /** How it was paid, as Safepay reports it (e.g. "card"); may be empty. */
  method: string;
}

/** A payment that was started but isn't confirmed yet (can be re-checked with the gateway). */
export interface PendingPayment {
  id: string;
  plan: PlanId;
  createdAt: string;
}

export interface Account {
  email: string;
  /** Current plan. null when billing is on and no paid time is left. */
  plan: PlanId | null;
  memberSince: string;
  notifications: { newEpisodes: boolean; recommendations: boolean; emailUpdates: boolean };
  /** True when Safepay is set up: plans must be paid for. */
  billing: boolean;
  /** Paid time that hasn't run out yet (billing on). */
  access: AccessInfo | null;
  /** Most recent unconfirmed payment, if any. */
  pendingPayment: PendingPayment | null;
}

export type QualityPreference = "auto" | "saver" | "standard" | "high";

export interface PlayerPrefs {
  volume?: number;
  muted?: boolean;
  rate?: number;
  audioLanguage?: string;
  /** Language code or "off". */
  subtitleLanguage?: string;
  quality?: QualityPreference;
}

export interface AuthState {
  signedIn: boolean;
  email: string | null;
  name: string | null;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/** Subscriber callback used by the external stores in lib/stores (useSyncExternalStore). */
export type Listener = () => void;
