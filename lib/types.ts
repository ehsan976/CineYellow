// Shared data types for the whole site. When the API arrives, its responses should map to these.

export type TitleType = "movie" | "series" | "anime";

export interface Title {
  id: string;
  title: string;
  type: TitleType;
  genres: string[];
  year: number;
  rating: string;
  /** Runtime like "2h 14m" (movies only). */
  duration: string | null;
  /** Number of seasons (series/anime only). */
  seasons: number | null;
  imageId: string;
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

/** A card in a homepage row. */
export interface RowItem {
  titleId: string;
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
  titleId: string;
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
  titleId: string;
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

/** What the player plays for one title / episode (lib/playback.ts). */
export interface Playback {
  titleId: string;
  src: string;
  storyboard: string;
  poster: string;
  credit: string;
  intro: { start: number; end: number };
  creditsAt: number;
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

export interface Account {
  email: string;
  plan: PlanId;
  memberSince: string;
  notifications: { newEpisodes: boolean; recommendations: boolean; emailUpdates: boolean };
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

/** Subscriber callback used by every localStorage-backed store. */
export type Listener = () => void;
