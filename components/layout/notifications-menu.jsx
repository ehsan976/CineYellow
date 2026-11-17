"use client";

import { useState } from "react";
import Image from "next/image";
import { Bell, CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { getTitle } from "@/lib/data/catalog";
import { notifications } from "@/lib/data/content";
import { useApp } from "@/components/providers/app-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationsMenu() {
  const { openTitle } = useApp();
  const [unread, setUnread] = useState(
    () => new Set(notifications.filter((n) => n.unread).map((n) => n.id))
  );
  const items = notifications
    .map((n) => ({ ...n, title: getTitle(n.titleId) }))
    .filter((n) => n.title);

  const markRead = (id) =>
    setUnread((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread.size ? `Notifications, ${unread.size} unread` : "Notifications"}
        >
          <Bell />
          {unread.size > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
              {unread.size}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-bold text-foreground">Notifications</DropdownMenuLabel>
          <button
            type="button"
            disabled={unread.size === 0}
            onClick={() => setUnread(new Set())}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground"
          >
            <CheckCheck className="size-3.5" /> Mark all as read
          </button>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[min(26rem,70svh)] overflow-y-auto p-1">
          {items.map((n) => {
            const isUnread = unread.has(n.id);
            return (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => {
                  markRead(n.id);
                  openTitle(n.titleId);
                }}
                className="items-start gap-3 rounded-md p-2"
              >
                <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded bg-muted">
                  <Image src={n.title.image} alt="" fill sizes="96px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-xs font-semibold", isUnread ? "text-primary" : "text-muted-foreground")}>
                    {n.label}
                  </span>
                  <span className="block truncate font-semibold text-foreground">{n.title.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground/80">{n.time}</span>
                </span>
                {isUnread && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
