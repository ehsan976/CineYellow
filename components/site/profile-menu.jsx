"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, CircleHelp, CreditCard, LogOut, Settings, User, Users } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/app-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const profiles = [
  { id: "guest", name: "Guest", plan: "Premium plan", color: "bg-primary text-primary-foreground" },
  { id: "family", name: "Family", plan: "Shared profile", color: "bg-sky-400 text-sky-950" },
  { id: "kids", name: "Kids", plan: "Kids profile · 7+", color: "bg-emerald-400 text-emerald-950" },
];

const comingSoon = (page) => toast(`${page} is coming soon`, { description: "This is a demo frontend." });

export function ProfileMenu() {
  const { myList, hydrated } = useApp();
  const [profileId, setProfileId] = useState("guest");
  const profile = profiles.find((p) => p.id === profileId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Profile menu (${profile.name})`}
          className="rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Avatar className="ring-2 ring-primary transition hover:ring-4">
            <AvatarFallback className={cn("font-semibold", profile.color)}>{profile.name[0]}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 p-2">
          <Avatar className="size-10">
            <AvatarFallback className={cn("text-base font-semibold", profile.color)}>{profile.name[0]}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-foreground">{profile.name}</span>
            <span className="block text-xs font-normal text-primary">{profile.plan}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Users /> Switch profile
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup
              value={profileId}
              onValueChange={(id) => {
                setProfileId(id);
                toast.success(`Switched to ${profiles.find((p) => p.id === id).name}`);
              }}
            >
              {profiles.map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id}>
                  <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-bold", p.color)}>
                    {p.name[0]}
                  </span>
                  {p.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => comingSoon("Profile")}>
            <User /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/my-list">
              <Bookmark /> My List
              {hydrated && myList.length > 0 && (
                <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {myList.length}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => comingSoon("Account")}>
            <CreditCard /> Account
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => comingSoon("Settings")}>
            <Settings /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => comingSoon("Help Center")}>
            <CircleHelp /> Help Center
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => toast("Signed out", { description: "Demo only — there's no real account yet." })}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
