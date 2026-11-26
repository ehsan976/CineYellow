"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

const PLACEHOLDER = "Titles, people, genres";

/**
 * Netflix-style search: a search icon that opens into a box right there in the navbar. Typing
 * goes straight to /search?q=… and the results grid updates as you type; empty and unfocused, the
 * box folds back into the icon. `alwaysOpen` (the search page on phones) shows the box full width.
 * Must be inside <Suspense> (it reads useSearchParams).
 */
export function NetflixSearch({ className, alwaysOpen = false }: { className?: string; alwaysOpen?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onSearchPage = pathname === "/search";

  const [value, setValue] = useState(onSearchPage ? (params.get("q") ?? "") : "");
  const [open, setOpen] = useState(alwaysOpen || (onSearchPage && Boolean(value)));
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const pathRef = useRef(pathname);

  // Leaving the search page empties the box and folds it away.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (pathname !== "/search") {
      setValue("");
      if (!alwaysOpen) setOpen(false);
    }
  }

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  function go(query: string) {
    const q = query.trim();
    const url = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    // First letter from another page opens the search page; after that the URL is just replaced.
    if (pathRef.current === "/search") router.replace(url, { scroll: false });
    else if (q) router.push(url);
  }

  function onChange(next: string) {
    setValue(next);
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => go(next), 300);
  }

  function openBox() {
    setOpen(true);
    // The input mounts on this render; focus it on the next frame.
    requestAnimationFrame(() => input.current?.focus());
  }

  function clear() {
    clearTimeout(timer.current ?? undefined);
    setValue("");
    if (pathRef.current === "/search") go("");
    input.current?.focus();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openBox}
        aria-label="Search"
        className={cn(
          "flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:text-primary",
          className
        )}
      >
        <Search className="size-5" />
      </button>
    );
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current ?? undefined);
        go(value);
        input.current?.blur();
      }}
      className={cn(
        "flex h-9 items-center gap-2 border border-foreground/80 bg-black/80 px-2.5 animate-in fade-in-0 slide-in-from-right-4 duration-200",
        alwaysOpen ? "h-11 w-full rounded-md" : "w-64 xl:w-72",
        className
      )}
    >
      <Search className="size-5 shrink-0 text-foreground" aria-hidden />
      <input
        ref={input}
        type="search"
        aria-label="Search titles"
        autoComplete="off"
        enterKeyHint="search"
        // The phone search page opens ready to type, as before.
        autoFocus={alwaysOpen}
        value={value}
        placeholder={PLACEHOLDER}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          // Empty and unfocused: fold back into the icon (not on the phone search page).
          if (!alwaysOpen && !value.trim()) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          if (value) clear();
          else if (!alwaysOpen) {
            setOpen(false);
            input.current?.blur();
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/50 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          // Keep focus in the box, so clearing doesn't fold it away.
          onPointerDown={(e) => e.preventDefault()}
          onClick={clear}
          className="shrink-0 text-foreground/80 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}
