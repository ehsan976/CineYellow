// Tiny external store for "My List", persisted in localStorage.
// Used with React's useSyncExternalStore; the server snapshot is always empty.
import type { Listener } from "@/lib/types";


const KEY = "cineyellow:my-list";
const EMPTY: string[] = [];
const listeners = new Set<Listener>();
let cache: string[] | null = null;

function load(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getMyList(): string[] {
  if (cache === null) cache = load();
  return cache;
}

export function getServerMyList(): string[] {
  return EMPTY;
}

export function setMyList(next: string[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked (private mode etc.) — keep the in-memory list.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeMyList(listener: Listener) {
  listeners.add(listener);
  // Keep tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
