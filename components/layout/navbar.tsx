"use client";

import type { AppNotification } from "@/lib/types";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { navLinks } from "@/lib/data/content";
import { useApp } from "@/components/providers/app-context";
import { Logo } from "@/components/layout/logo";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { SearchBox, SearchBoxFallback } from "@/components/layout/search-box";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

// Pages whose top is a full-bleed image keep a transparent header until scrolled.
const hasHeroUnderHeader = (pathname) => pathname === "/" || pathname.startsWith("/title/");

const isActive = (pathname, href) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

// Category chips under the header on phones (Home, Search, My List and Account are in the tab bar).
const chipLinks = navLinks.filter((link) => link.href !== "/" && link.href !== "/my-list");

export function Navbar({ notifications = [] }: { notifications?: AppNotification[] }) {
  const pathname = usePathname();
  const { myList, hydrated } = useApp();
  const auth = useAuth();
  const [scrolled, setScrolled] = useState(false);
  // Phones: the chip row slides away while scrolling down and comes back on the way up.
  const [chipsHidden, setChipsHidden] = useState(false);
  const listCount = hydrated ? myList.length : 0;

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      if (Math.abs(y - lastY) > 8) {
        setChipsHidden(y > lastY && y > 80);
        lastY = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const countBadge = (href) =>
    href === "/my-list" && listCount > 0 ? (
      <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
        {listCount}
      </span>
    ) : null;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || !hasHeroUnderHeader(pathname)
          ? "border-b border-border bg-background/90 backdrop-blur-md"
          : "bg-linear-to-b from-black/80 to-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4 md:h-16 md:px-10">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                  active ? "text-primary" : "text-foreground/80"
                )}
              >
                {link.label}
                {countBadge(link.href)}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={<SearchBoxFallback className="hidden lg:block" inputClassName="h-9 w-64" />}>
            <SearchBox className="hidden lg:block" inputClassName="h-9 w-64" />
          </Suspense>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex lg:hidden" aria-label="Search" asChild>
            <Link href="/search">
              <Search />
            </Link>
          </Button>
          {!hydrated ? (
            // Sign-in state is only known in the browser; hold the space to avoid a jump.
            <span className="size-8 rounded-full bg-muted" aria-hidden />
          ) : auth.signedIn ? (
            <>
              <NotificationsMenu items={notifications} />
              <ProfileMenu />
            </>
          ) : (
            <Button asChild size="sm" className="rounded-full px-4 font-semibold">
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign In</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Phones: category chips. 56px header + 40px chips = the 96px (pt-24) pages already leave. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 md:hidden",
          chipsHidden ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        )}
      >
        <nav
          aria-label="Categories"
          className="scrollbar-none flex min-h-0 items-start gap-2 overflow-x-auto overflow-y-hidden px-4"
        >
          {chipLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                tabIndex={chipsHidden ? -1 : undefined}
                className={cn(
                  "mb-2.5 shrink-0 rounded-full border px-3.5 py-1 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-foreground/30 bg-black/20 text-foreground/90 backdrop-blur active:bg-foreground/10"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
