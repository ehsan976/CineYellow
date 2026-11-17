"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Live search input. Typing updates /search?q=… (debounced).
 * Must be rendered inside <Suspense> because it reads useSearchParams.
 */
export function SearchBox({
  className,
  inputClassName,
  autoFocus = false,
}: {
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onSearchPage = pathname === "/search";

  const [value, setValue] = useState(onSearchPage ? (params.get("q") ?? "") : "");
  const timer = useRef(null);
  const pathRef = useRef(pathname);

  // Clear the box when the user leaves the search page.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (pathname !== "/search") setValue("");
  }

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function go(query) {
    const q = query.trim();
    const url = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    if (pathRef.current === "/search") router.replace(url, { scroll: false });
    else router.push(url);
  }

  function onChange(e) {
    const next = e.target.value;
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), 250);
  }

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        go(value);
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue("");
            e.currentTarget.blur();
          }
        }}
        autoFocus={autoFocus}
        placeholder="Search movies, series, anime…"
        aria-label="Search titles"
        className={cn(
          "rounded-full bg-black/40 pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden",
          inputClassName
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            clearTimeout(timer.current);
            if (pathRef.current === "/search") go("");
          }}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-primary"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}

/** Static stand-in shown while the real box waits for search params. */
export function SearchBoxFallback({ className, inputClassName }: { className?: string; inputClassName?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        disabled
        placeholder="Search movies, series, anime…"
        aria-label="Search titles"
        className={cn("rounded-full bg-black/40 pl-9", inputClassName)}
      />
    </div>
  );
}
