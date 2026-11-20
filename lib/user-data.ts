// Shapes and checks shared by the browser stores and the server (/api/me, server actions).
// Nothing here touches the database, so client code can import it too.
import type { Account, AvatarColor, HistoryEntry, PlanId, PlayerPrefs, Profile } from "@/lib/types";

export const PLAN_IDS: PlanId[] = ["basic", "standard", "premium"];

/**
 * Monthly price of each plan in Pakistani rupees. The server charges exactly these amounts
 * (never a price sent by the browser), and the plan cards show them. Change them here.
 */
export const PLAN_PRICES_PKR: Record<PlanId, number> = { basic: 450, standard: 800, premium: 1100 };

export const formatPkr = (amount: number) => `Rs ${amount.toLocaleString("en-PK")}`;
export const AVATAR_COLORS: AvatarColor[] = ["yellow", "sky", "emerald", "rose", "violet", "orange"];
export const LANGUAGES: string[] = ["English", "Hindi", "Urdu", "Spanish", "French", "Arabic", "Japanese"];

/** Everything /api/me returns for the signed-in user. */
export interface UserData {
  account: Account;
  profiles: Profile[];
  /** Saved title ids per profile id, newest first. */
  lists: Record<string, string[]>;
  /** Watch history per profile id, keyed by playback key. */
  history: Record<string, Record<string, HistoryEntry>>;
  /** Player preferences per profile id. */
  prefs: Record<string, PlayerPrefs>;
}

/** Body of POST /api/me/progress (also sent with navigator.sendBeacon). */
export interface ProgressBatch {
  profileId: string;
  upserts: HistoryEntry[];
  deletes: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const shortText = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
const intOrNull = (v: unknown) => v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 10_000);

export const isPlanId = (v: unknown): v is PlanId => PLAN_IDS.includes(v as PlanId);

/** Only the fields a viewer may edit, checked. Returns null when nothing valid is left. */
export function cleanProfilePatch(patch: unknown): Partial<Pick<Profile, "name" | "color" | "kids" | "language">> | null {
  if (!isObject(patch)) return null;
  const out: Partial<Pick<Profile, "name" | "color" | "kids" | "language">> = {};
  if (typeof patch.name === "string" && patch.name.trim()) out.name = patch.name.trim().slice(0, 24);
  if (AVATAR_COLORS.includes(patch.color as AvatarColor)) out.color = patch.color as AvatarColor;
  if (typeof patch.kids === "boolean") out.kids = patch.kids;
  if (LANGUAGES.includes(patch.language as string)) out.language = patch.language as string;
  return Object.keys(out).length ? out : null;
}

export function cleanPlayerPrefs(prefs: unknown): PlayerPrefs {
  if (!isObject(prefs)) return {};
  const out: PlayerPrefs = {};
  if (typeof prefs.volume === "number" && prefs.volume >= 0 && prefs.volume <= 1) out.volume = prefs.volume;
  if (typeof prefs.muted === "boolean") out.muted = prefs.muted;
  if (typeof prefs.rate === "number" && prefs.rate >= 0.25 && prefs.rate <= 4) out.rate = prefs.rate;
  if (shortText(prefs.audioLanguage, 16)) out.audioLanguage = prefs.audioLanguage as string;
  if (shortText(prefs.subtitleLanguage, 16)) out.subtitleLanguage = prefs.subtitleLanguage as string;
  if (["auto", "saver", "standard", "high"].includes(prefs.quality as string)) out.quality = prefs.quality as PlayerPrefs["quality"];
  return out;
}

export function isHistoryEntry(v: unknown): v is HistoryEntry {
  return (
    isObject(v) &&
    shortText(v.key, 128) &&
    shortText(v.titleId, 64) &&
    intOrNull(v.season) &&
    intOrNull(v.episode) &&
    Number.isFinite(v.time) &&
    (v.time as number) >= 0 &&
    Number.isFinite(v.duration) &&
    (v.duration as number) > 0 &&
    (v.duration as number) < 1_000_000
  );
}

export function isTitleIdList(v: unknown): v is string[] {
  return Array.isArray(v) && v.length <= 500 && v.every((id) => shortText(id, 64));
}
