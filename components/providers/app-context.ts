"use client";

import { createContext, useContext } from "react";

export const AppContext = createContext(null);

/** Access My List + detail popup controls from any client component. */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
