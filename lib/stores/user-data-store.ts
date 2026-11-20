// The signed-in user's data (profiles, My List, watch history, player prefs, settings), loaded
// from /api/me and saved back to Postgres. One external store for useSyncExternalStore; the
// small store files next to this one (profile-store, my-list-store …) are views over it.
//
// Writes are optimistic: the screen updates at once, the server action runs in the background,
// and on failure the change is rolled back with a toast. Watch progress is batched and sent to
// /api/me/progress every few seconds (and with sendBeacon when the tab closes).
import type { Account, HistoryEntry, Listener, PlayerPrefs, Profile } from "@/lib/types";
import type { ProgressBatch, UserData } from "@/lib/user-data";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { isPublicPage, loginUrl } from "@/lib/auth/routes";
import {
  addToListAction,
  clearHistoryAction,
  removeFromListAction,
  setMyListAction,
  updateNotificationsAction,
  updatePlanAction,
  updatePlayerPrefsAction,
  updateProfileAction,
  type ActionResult,
} from "@/app/actions/user-data";

export type History = Record<string, HistoryEntry>;
export type Status = "idle" | "loading" | "ready" | "error";

export interface ProfilesState {
  activeId: string;
  profiles: Profile[];
}

interface State {
  status: Status;
  userId: string | null;
  account: Account;
  profilesState: ProfilesState;
  lists: Record<string, string[]>;
  history: Record<string, History>;
  prefs: Record<string, PlayerPrefs>;
}

const ACTIVE_KEY = "cineyellow:active-profile";
const PROGRESS_FLUSH_MS = 10_000;
const PREFS_SAVE_MS = 2_000;

const EMPTY_LIST: string[] = Object.freeze([]) as unknown as string[];
const EMPTY_HISTORY: History = Object.freeze({});
const EMPTY_PREFS: PlayerPrefs = Object.freeze({});

/** Shown until /api/me answers (and during prerender). */
const PLACEHOLDER_PROFILE: Profile = { id: "", name: "Profile", color: "yellow", kids: false, language: "English" };
const INITIAL: State = Object.freeze({
  status: "idle",
  userId: null,
  account: {
    email: "",
    plan: "standard",
    memberSince: new Date().toISOString().slice(0, 10),
    notifications: { newEpisodes: true, recommendations: true, emailUpdates: false },
    billing: false,
    access: null,
    pendingPayment: null,
  },
  profilesState: { activeId: "", profiles: [PLACEHOLDER_PROFILE] },
  lists: {},
  history: {},
  prefs: {},
}) as State;

let state: State = INITIAL;
const listeners = new Set<Listener>();

/** Bumped by every local change, so a slower /api/me answer can't overwrite newer edits. */
let writes = 0;

function setState(patch: Partial<State>, { write = false } = {}) {
  if (write) writes++;
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
  if (state.status === "ready") scheduleCacheSave();
}

export function subscribeUserData(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getUserDataState = () => state;
export const getServerUserDataState = () => INITIAL;
export const getUserDataStatus = () => state.status;
export const isUserDataReady = () => state.status === "ready";

// ---------- Views used by the store files ----------

export const activeProfileId = () => state.profilesState.activeId;
export const getActiveList = () => state.lists[activeProfileId()] ?? EMPTY_LIST;
export const getActiveHistory = () => state.history[activeProfileId()] ?? EMPTY_HISTORY;
export const getActivePrefs = () => state.prefs[activeProfileId()] ?? EMPTY_PREFS;
export const EMPTY = { list: EMPTY_LIST, history: EMPTY_HISTORY, prefs: EMPTY_PREFS };

// ---------- Loading ----------

let loading: Promise<void> | null = null;

function readActiveId(profiles: Profile[]) {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(ACTIVE_KEY);
  } catch {
    // Storage blocked.
  }
  return profiles.some((p) => p.id === saved) ? saved! : (profiles[0]?.id ?? "");
}

/** Apply a UserData snapshot, keeping watch progress that hasn't been sent yet. */
function applyData(data: UserData) {
  const history = { ...data.history };
  for (const [profileId, batch] of pending) {
    history[profileId] = { ...history[profileId], ...Object.fromEntries(batch.upserts) };
    for (const key of batch.deletes) delete history[profileId]?.[key];
  }
  setState({
    status: "ready",
    account: data.account,
    profilesState: { activeId: readActiveId(data.profiles), profiles: data.profiles },
    lists: data.lists,
    history,
    prefs: data.prefs,
  });
}

/**
 * Load this user's data. If a copy from the last visit is cached in this browser, pages render
 * from it immediately and /api/me refreshes it in the background (the database is far away,
 * so waiting for it on every page load felt slow). No-op if already loaded or loading.
 */
export function loadUserData(userId: string, { force = false } = {}) {
  if (!force && state.userId === userId && (state.status === "ready" || loading)) return loading ?? Promise.resolve();
  installFlushOnLeave();

  const cached = force ? null : readCache(userId);
  if (cached) {
    state = { ...state, userId };
    applyData(cached);
  } else {
    setState({ status: "loading", userId });
  }

  const writesAtStart = writes;
  const request = (async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.status === 401) return endRevokedSession();
      if (!res.ok) throw new Error(`GET /api/me ${res.status}`);
      const data: UserData = await res.json();
      if (state.userId !== userId) return; // signed out / switched account meanwhile
      // Edited something while this was in flight? Local state is newer; keep it.
      if (writes !== writesAtStart && state.status === "ready") return;
      applyData(data);
      importLegacyData();
    } catch (error) {
      console.error(error);
      // With a cached copy on screen, a failed refresh isn't worth an error.
      if (state.userId === userId && state.status !== "ready") setState({ status: "error" });
    } finally {
      loading = null;
    }
  })();
  loading = request;
  return request;
}

/**
 * /api/me said 401 although Better Auth's cookie still looks valid: the session was revoked or the
 * user banned. Clear the cookies (or proxy.ts would keep treating the visitor as signed in) and
 * go to the sign-in page.
 */
async function endRevokedSession() {
  clearCache();
  pending.clear();
  await authClient.signOut().catch(() => {});
  const { pathname, search } = window.location;
  window.location.assign(isPublicPage(pathname) ? pathname + search : loginUrl(pathname + search));
}

/** Forget everything in memory and in the browser cache (sign-out). Unsent progress is sent first. */
export function resetUserData() {
  clearCache();
  if (state === INITIAL) return;
  flushProgress({ beacon: true });
  clearTimeout(prefsTimer);
  state = INITIAL;
  listeners.forEach((listener) => listener());
}

// ---------- Browser cache of the last /api/me data ----------

const CACHE_KEY = "cineyellow:user-data";
let cacheTimer: ReturnType<typeof setTimeout> | undefined;

function readCache(userId: string): UserData | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    if (cached?.userId === userId && cached.data?.profiles?.length) return cached.data as UserData;
  } catch {
    // Storage blocked or bad JSON.
  }
  return null;
}

function scheduleCacheSave() {
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    if (state.status !== "ready" || !state.userId) return;
    const { account, profilesState, lists, history, prefs } = state;
    const data: UserData = { account, profiles: profilesState.profiles, lists, history, prefs };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: state.userId, data }));
    } catch {
      // Storage full or blocked — the next visit just waits for /api/me.
    }
  }, 500);
}

function clearCache() {
  clearTimeout(cacheTimer);
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

// ---------- Optimistic writes ----------

async function sync(call: () => Promise<ActionResult>, rollback: () => void) {
  let result: ActionResult;
  try {
    result = await call();
  } catch {
    result = { ok: false, error: "Can't reach the server. Check your connection and try again." };
  }
  if (!result.ok) {
    rollback();
    toast.error(result.error);
  }
  return result;
}

function notReady() {
  if (state.status === "ready") return false;
  toast("Still loading your profile…");
  return true;
}

export function setActiveProfile(id: string) {
  const { activeId, profiles } = state.profilesState;
  if (activeId === id || !profiles.some((p) => p.id === id)) return;
  flushProgress();
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // Storage blocked — keep it for this visit.
  }
  setState({ profilesState: { activeId: id, profiles } });
}

export function updateProfile(id: string, patch: Partial<Profile>) {
  if (notReady()) return;
  const before = state.profilesState;
  setState({
    profilesState: { ...before, profiles: before.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
  }, { write: true });
  return sync(
    () => updateProfileAction(id, patch),
    () => setState({ profilesState: before }, { write: true })
  );
}

export function setActiveList(next: string[]) {
  if (notReady()) return;
  const id = activeProfileId();
  const before = state.lists;
  const prev = before[id] ?? EMPTY_LIST;
  setState({ lists: { ...before, [id]: next } }, { write: true });

  // A toggle adds or removes one title: send just that (one small query) instead of the whole list.
  const added = next.filter((t) => !prev.includes(t));
  const removed = prev.filter((t) => !next.includes(t));
  const call =
    added.length === 1 && removed.length === 0
      ? () => addToListAction(id, added[0])
      : removed.length === 1 && added.length === 0
        ? () => removeFromListAction(id, removed[0])
        : () => setMyListAction(id, next);
  return sync(call, () => setState({ lists: before }, { write: true }));
}

export function clearActiveHistory() {
  if (notReady()) return;
  const id = activeProfileId();
  const before = state.history;
  pending.delete(id);
  setState({ history: { ...before, [id]: EMPTY_HISTORY } }, { write: true });
  return sync(
    () => clearHistoryAction(id),
    () => setState({ history: before }, { write: true })
  );
}

let prefsTimer: ReturnType<typeof setTimeout> | undefined;

/** Player prefs change many times a second while dragging volume, so the save is debounced. */
export function setActivePrefs(prefs: PlayerPrefs) {
  // Before load we don't know the saved prefs; saving now would overwrite them with defaults.
  if (state.status !== "ready") return;
  const id = activeProfileId();
  setState({ prefs: { ...state.prefs, [id]: prefs } }, { write: true });
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => {
    updatePlayerPrefsAction(id, prefs).catch(() => {});
  }, PREFS_SAVE_MS);
}

export function updateAccount(patch: Partial<Account>) {
  if (notReady()) return;
  const before = state.account;
  const next = { ...before, ...patch, notifications: { ...before.notifications, ...patch.notifications } };
  setState({ account: next }, { write: true });
  const rollback = () => setState({ account: before }, { write: true });
  // With a payment gateway on, plans change only by paying (lib/stores/payment-store.ts).
  if (patch.plan && patch.plan !== before.plan && !before.billing) sync(() => updatePlanAction(patch.plan!), rollback);
  if (patch.notifications) sync(() => updateNotificationsAction(patch.notifications!), rollback);
}

// ---------- Watch progress (batched) ----------

type PendingBatch = { upserts: Map<string, HistoryEntry>; deletes: Set<string> };
const pending = new Map<string, PendingBatch>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function pendingFor(profileId: string) {
  let batch = pending.get(profileId);
  if (!batch) pending.set(profileId, (batch = { upserts: new Map(), deletes: new Set() }));
  return batch;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    flushProgress();
  }, PROGRESS_FLUSH_MS);
}

export function setProgress(entry: HistoryEntry | null, key: string) {
  const id = activeProfileId();
  if (!id) return;
  const current = { ...(state.history[id] ?? EMPTY_HISTORY) };
  const batch = pendingFor(id);
  if (entry) {
    current[key] = entry;
    batch.upserts.set(key, entry);
    batch.deletes.delete(key);
  } else {
    delete current[key];
    batch.deletes.add(key);
    batch.upserts.delete(key);
  }
  setState({ history: { ...state.history, [id]: current } }, { write: true });
  scheduleFlush();
}

/** Send queued progress now. `beacon` survives the page closing. */
export function flushProgress({ beacon = false } = {}): Promise<void> {
  clearTimeout(flushTimer);
  flushTimer = undefined;
  const requests: Promise<void>[] = [];
  for (const [profileId, batch] of pending) {
    if (!batch.upserts.size && !batch.deletes.size) continue;
    const body: ProgressBatch = { profileId, upserts: [...batch.upserts.values()], deletes: [...batch.deletes] };
    pending.delete(profileId);
    const json = JSON.stringify(body);
    if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon?.("/api/me/progress", json)) continue;
    requests.push(
      fetch("/api/me/progress", { method: "POST", body: json, keepalive: true }).then(
        (res) => {
          if (!res.ok && res.status !== 401) requeue(profileId, body);
        },
        () => requeue(profileId, body)
      )
    );
  }
  return Promise.all(requests).then(() => undefined);
}

/** Put a failed batch back, unless newer values were queued meanwhile. */
function requeue(profileId: string, body: ProgressBatch) {
  const batch = pendingFor(profileId);
  for (const entry of body.upserts) {
    if (!batch.upserts.has(entry.key) && !batch.deletes.has(entry.key)) batch.upserts.set(entry.key, entry);
  }
  for (const key of body.deletes) if (!batch.upserts.has(key)) batch.deletes.add(key);
  scheduleFlush();
}

let leaveInstalled = false;
function installFlushOnLeave() {
  if (leaveInstalled || typeof window === "undefined") return;
  leaveInstalled = true;
  const leave = () => flushProgress({ beacon: true });
  window.addEventListener("pagehide", leave);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && leave());
}

// ---------- One-time move from localStorage ----------

const LEGACY = {
  list: "cineyellow:my-list",
  history: "cineyellow:watch-history",
  prefs: "cineyellow:player-prefs",
  account: "cineyellow:account",
  profiles: "cineyellow:profiles",
};

function readLegacy(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

/**
 * Before the database, My List / history / player prefs lived in localStorage. If they're still
 * there and this profile is empty on the server, upload them once, then remove the old keys.
 */
function importLegacyData() {
  let present = false;
  try {
    present = Object.values(LEGACY).some((key) => localStorage.getItem(key) !== null);
  } catch {
    return;
  }
  if (!present) return;

  const id = activeProfileId();
  const list = readLegacy(LEGACY.list);
  const history = readLegacy(LEGACY.history);
  const prefs = readLegacy(LEGACY.prefs);

  if (Array.isArray(list) && list.length && !(state.lists[id] ?? []).length) {
    setActiveList(list.filter((x): x is string => typeof x === "string").slice(0, 500));
  }
  if (history && typeof history === "object" && !Object.keys(state.history[id] ?? {}).length) {
    for (const entry of Object.values(history as History)) {
      if (entry?.key && entry.titleId) setProgress(entry, entry.key);
    }
    flushProgress();
  }
  if (prefs && typeof prefs === "object" && !Object.keys(state.prefs[id] ?? {}).length) {
    setActivePrefs(prefs as PlayerPrefs);
  }

  try {
    Object.values(LEGACY).forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
