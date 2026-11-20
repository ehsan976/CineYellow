// "My List" for the active profile, stored in Postgres (my_list table) via user-data-store.
// Same exports as before, so useSyncExternalStore callers didn't change.
import { EMPTY, getActiveList, setActiveList, subscribeUserData } from "@/lib/stores/user-data-store";

export const getMyList = getActiveList;

export function getServerMyList(): string[] {
  return EMPTY.list;
}

/** Replace the active profile's list (newest first). Saved to the database in the background. */
export function setMyList(next: string[]) {
  setActiveList(next);
}

export const subscribeMyList = subscribeUserData;
