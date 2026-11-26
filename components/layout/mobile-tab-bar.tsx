"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, House, Search, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/app-context";

const tabs = [
  { label: "Home", href: "/", icon: House },
  { label: "Search", href: "/search", icon: Search },
  { label: "My List", href: "/my-list", icon: Bookmark },
  { label: "Account", href: "/account", icon: UserRound },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** App-style tab bar fixed to the bottom of phone screens (hidden from md up, where the navbar has the links). */
export function MobileTabBar() {
  const pathname = usePathname();
  const { myList, hydrated } = useApp();
  const listCount = hydrated ? myList.length : 0;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid h-14 grid-cols-4">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon className={cn("size-5", active && "fill-primary/20")} strokeWidth={active ? 2.5 : 2} />
                  {href === "/my-list" && listCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-4 font-bold text-primary-foreground">
                      {listCount}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Keeps the end of the page clear of the fixed tab bar on phones. */
export function MobileTabBarSpacer() {
  return <div aria-hidden className="h-[calc(3.5rem+env(safe-area-inset-bottom))] shrink-0 md:hidden" />;
}
