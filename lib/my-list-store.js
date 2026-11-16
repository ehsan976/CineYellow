// Tiny external store for "My List", persisted in localStorage.
// Used with React's useSyncExternalStore; the server snapshot is always empty.

const KEY = "cineyellow:my-list";
const EMPTY = [];
const listeners = new Set();
let cache = null;

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getMyList() {
  if (cache === null) cache = load();
  return cache;
}

export function getServerMyList() {
  return EMPTY;
}

export function setMyList(next) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked (private mode etc.) — keep the in-memory list.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeMyList(listener) {
  listeners.add(listener);
  // Keep tabs in sync.
  const onStorage = (e) => {
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
