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

/** What the player plays for one title / episode (lib/player/playback.ts). */
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

/** "zurvapay" for new payments; "safepay" only on older rows from before the switch. */
export type PaymentProvider = "zurvapay" | "safepay";

/** Plan time bought through ZurvaPay (from the latest paid row in the `payment` table). */
export interface AccessInfo {
  plan: PlanId;
  /** ISO date the paid time ends. */
  until: string;
  /** How it was paid, e.g. "JazzCash", "EasyPaisa" or "Raast QR"; may be empty. */
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
  /** True when ZurvaPay is set up: plans must be paid for. */
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
