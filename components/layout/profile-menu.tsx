"use client";

import Link from "next/link";
import { Bookmark, CircleHelp, CreditCard, LogOut, Settings, Shield, User, Users } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/client";
import { signOut } from "@/lib/stores/auth-store";
import { avatarColors, planLabel, setActiveProfile } from "@/lib/stores/profile-store";
import { useApp } from "@/components/providers/app-context";
import { useProfiles } from "@/hooks/use-profile";
import { useAccount } from "@/hooks/use-account";
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

export function ProfileMenu() {
  const { myList, hydrated } = useApp();
  const { profiles, active: profile } = useProfiles();
  const { planInfo } = useAccount();
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";
  const initial = (p) => (p.name.trim()[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Profile menu (${profile.name})`}
          className="rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Avatar className="ring-2 ring-primary transition hover:ring-4">
            <AvatarFallback className={cn("font-semibold", avatarColors[profile.color])}>{initial(profile)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 p-2">
          <Avatar className="size-10">
            <AvatarFallback className={cn("text-base font-semibold", avatarColors[profile.color])}>{initial(profile)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-foreground">{profile.name}</span>
            <span className="block text-xs font-normal text-primary">{planLabel(profile, planInfo?.name)}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Users /> Switch profile
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup
              value={profile.id}
              onValueChange={(id) => {
                setActiveProfile(id);
                toast.success(`Switched to ${profiles.find((p) => p.id === id).name}`);
              }}
            >
              {profiles.map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id}>
                  <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-bold", avatarColors[p.color])}>
                    {initial(p)}
                  </span>
                  {p.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User /> Profile
            </Link>
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
          <DropdownMenuItem asChild>
            <Link href="/account">
              <CreditCard /> Account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/help">
              <CircleHelp /> Help Center
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield /> Admin
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            await signOut();
            // Full navigation so cached pages from the signed-in session are dropped.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload drops signed-in cached pages
            window.location.assign("/welcome");
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
