"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { navLinks } from "@/lib/data";
import { useApp } from "@/components/providers/app-context";
import { Logo } from "@/components/site/logo";
import { NotificationsMenu } from "@/components/site/notifications-menu";
import { ProfileMenu } from "@/components/site/profile-menu";
import { SearchBox, SearchBoxFallback } from "@/components/site/search-box";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Pages whose top is a full-bleed image keep a transparent header until scrolled.
const hasHeroUnderHeader = (pathname) => pathname === "/" || pathname.startsWith("/title/");

const isActive = (pathname, href) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function Navbar() {
  const pathname = usePathname();
  const { myList, hydrated } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const listCount = hydrated ? myList.length : 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 md:px-10">
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
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Search" asChild>
            <Link href="/search">
              <Search />
            </Link>
          </Button>
          <NotificationsMenu />
          <ProfileMenu />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {navLinks.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted",
                          active && "bg-accent text-accent-foreground"
                        )}
                      >
                        {link.label}
                        {countBadge(link.href)}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
