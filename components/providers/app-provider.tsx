"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth/client";
import { isPublicPage, loginUrl } from "@/lib/auth/routes";
import { isLeaving } from "@/lib/stores/auth-store";
import { getTitle } from "@/lib/data/catalog";
import {
  getMyList,
  getServerMyList,
  setMyList,
  subscribeMyList,
} from "@/lib/stores/my-list-store";
import { getUserDataStatus, loadUserData, resetUserData, subscribeUserData } from "@/lib/stores/user-data-store";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { AppContext } from "@/components/providers/app-context";
import { TitleDialog } from "@/components/title/title-dialog";
import { Toaster } from "@/components/ui/sonner";

const noopSubscribe = () => () => {};

export function AppProvider({ children }: { children: ReactNode }) {
  const myList = useSyncExternalStore(subscribeMyList, getMyList, getServerMyList);
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const dataStatus = useSyncExternalStore(subscribeUserData, getUserDataStatus, () => "idle" as const);

  // proxy.ts checks the session on every navigation; this also catches a session that ends
  // while a page is open (signed out in another tab, revoked from another device, expired).
  const session = useSession();
  const userId = session.data?.user.id ?? null;
  const sessionGone = !session.isPending && !session.error && !session.data;
  useEffect(() => {
    if (!sessionGone || isLeaving() || isPublicPage(window.location.pathname)) return;
    const { pathname, search } = window.location;
    window.location.assign(loginUrl(pathname + search));
  }, [sessionGone]);

  // Signed in → load profiles, My List, history … from Postgres (/api/me). Signed out → forget them.
  useEffect(() => {
    if (userId) loadUserData(userId);
    else if (sessionGone) resetUserData();
  }, [userId, sessionGone]);

  useEffect(() => {
    if (dataStatus !== "error" || !userId) return;
    toast.error("Couldn't load your profile.", {
      id: "user-data-error",
      duration: Infinity,
      action: { label: "Retry", onClick: () => loadUserData(userId, { force: true }) },
    });
  }, [dataStatus, userId]);

  // Pages show skeletons until this is true: in the browser, and the user's data has loaded
  // (or there's no user, e.g. the public help page while signed out).
  const hydrated = inBrowser && (dataStatus === "ready" || sessionGone);

  // Keep the last opened id after closing so the close animation still has content.
  const [dialog, setDialog] = useState({ id: null, open: false });

  const toggleList = useCallback((id) => {
    if (getUserDataStatus() !== "ready") return toast("Still loading your profile…");
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
      <ImpersonationBanner />
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
