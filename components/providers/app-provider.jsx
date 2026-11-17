"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { getTitle } from "@/lib/data/catalog";
import {
  getMyList,
  getServerMyList,
  setMyList,
  subscribeMyList,
} from "@/lib/stores/my-list-store";
import { AppContext } from "@/components/providers/app-context";
import { TitleDialog } from "@/components/title/title-dialog";
import { Toaster } from "@/components/ui/sonner";

const noopSubscribe = () => () => {};

export function AppProvider({ children }) {
  const myList = useSyncExternalStore(subscribeMyList, getMyList, getServerMyList);
  // false during prerender/hydration, true once running in the browser
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // Keep the last opened id after closing so the close animation still has content.
  const [dialog, setDialog] = useState({ id: null, open: false });

  const toggleList = useCallback((id) => {
    const current = getMyList();
    const name = getTitle(id)?.title;
    if (current.includes(id)) {
      setMyList(current.filter((x) => x !== id));
      toast("Removed from My List", { description: name });
    } else {
      setMyList([id, ...current]);
      toast.success("Added to My List", { description: name });
    }
  }, []);

  const openTitle = useCallback((id) => setDialog({ id, open: true }), []);
  const closeTitle = useCallback(() => setDialog((d) => ({ ...d, open: false })), []);

  const value = useMemo(
    () => ({
      myList,
      hydrated,
      isInList: (id) => myList.includes(id),
      toggleList,
      openTitle,
      closeTitle,
    }),
    [myList, hydrated, toggleList, openTitle, closeTitle]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <TitleDialog
        titleId={dialog.id}
        open={dialog.open}
        onOpenChange={(open) => !open && closeTitle()}
      />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{ classNames: { toast: "cn-toast", icon: "text-primary" } }}
      />
    </AppContext.Provider>
  );
}
