"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Languages, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Users", icon: Users },
  { href: "/admin/languages", label: "Languages", icon: Languages },
  { href: "/admin/videos", label: "Videos", icon: Film },
];

/** Tabs between the admin pages. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="mb-6 flex gap-1 border-b border-border">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
