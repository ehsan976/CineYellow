"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Check, Clock, Play, Tv } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { getTitle } from "@/lib/catalog";
import { watchHref } from "@/lib/playback";
import { avatarColors, languages, planLabel, setActiveProfile, updateProfile } from "@/lib/profile-store";
import { recentByTitle } from "@/lib/watch-history-store";
import { gridClass } from "@/lib/ui";
import { useApp } from "@/components/providers/app-context";
import { PosterCard } from "@/components/site/poster-card";
import { useProfiles } from "@/components/site/use-profile";
import { useWatchHistory } from "@/components/site/use-watch-target";
import { useAccount } from "@/components/site/use-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const initial = (name) => (name.trim()[0] ?? "?").toUpperCase();

function Avatar({ profile, className }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl font-black",
        avatarColors[profile.color],
        className
      )}
    >
      {initial(profile.name)}
    </span>
  );
}

export function ProfilePage() {
  const { hydrated, myList } = useApp();
  const { profiles, active } = useProfiles();
  const history = useWatchHistory();
  const { planInfo } = useAccount();

  if (!hydrated) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading profile">
        <div className="flex items-center gap-5">
          <Skeleton className="size-24 rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-72 w-full max-w-2xl rounded-xl" />
      </div>
    );
  }

  const inProgress = recentByTitle(history);
  const minutesWatched = Math.round(Object.values(history).reduce((sum, e) => sum + e.time, 0) / 60);
  const listTitles = myList.map(getTitle).filter(Boolean);
  const stats = [
    { icon: Bookmark, label: "In My List", value: listTitles.length },
    { icon: Tv, label: "In progress", value: inProgress.length },
    { icon: Clock, label: "Minutes watched", value: minutesWatched },
  ];

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar profile={active} className="size-24 text-5xl sm:size-28 sm:text-6xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Profile</p>
          <h1 className="truncate text-3xl font-black tracking-tight md:text-5xl">{active.name}</h1>
          <span className="mt-3 block h-1 w-16 rounded-full bg-primary" />
          <p className="mt-3 text-sm font-medium text-primary">{planLabel(active, planInfo.name)}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3 sm:w-auto">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5 text-primary" /> {label}
              </dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* key: switching profile starts a fresh form with that profile's values */}
        <EditProfileCard key={active.id} profile={active} />

        <Card>
          <CardHeader>
            <CardTitle>Switch profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profiles.map((p) => {
              const current = p.id === active.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={current}
                  onClick={() => {
                    setActiveProfile(p.id);
                    toast.success(`Switched to ${p.name}`);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
                    current ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  )}
                >
                  <Avatar profile={p} className="size-10 text-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">{planLabel(p, planInfo.name)}</span>
                  </span>
                  {current && <Check className="size-4 text-primary" />}
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Continue Watching */}
      <section>
        <h2 className="mb-4 text-xl font-bold md:text-2xl">Continue Watching</h2>
        {inProgress.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {inProgress.slice(0, 8).map((entry, index) => {
              const title = getTitle(entry.titleId);
              if (!title) return null;
              const left = Math.max(1, Math.round((entry.duration - entry.time) / 60));
              return (
                <Link
                  key={entry.key}
                  href={watchHref(entry.titleId, entry.season, entry.episode)}
                  className="group/card overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:ring-2 hover:ring-primary"
                >
                  <span className="relative block aspect-video">
                    <Image
                      src={title.image}
                      alt=""
                      fill
                      loading={index < 4 ? "eager" : undefined}
                      sizes="(max-width: 640px) 100vw, 25vw"
                      className="object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover/card:opacity-100">
                      <Play className="size-10 fill-primary text-primary" />
                    </span>
                  </span>
                  <Progress value={(entry.time / entry.duration) * 100} className="h-1 rounded-none" />
                  <span className="block px-3 py-2.5">
                    <span className="block truncate font-semibold">{title.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.season ? `S${entry.season}:E${entry.episode} · ` : ""}
                      {left}m left
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState text="Nothing in progress yet. Start something and it will show up here." />
        )}
      </section>

      {/* My List */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold md:text-2xl">My List</h2>
          {listTitles.length > 6 && (
            <Link href="/my-list" className="text-sm font-medium text-muted-foreground hover:text-primary">
              See all ({listTitles.length})
            </Link>
          )}
        </div>
        {listTitles.length ? (
          <div className={gridClass}>
            {listTitles.slice(0, 6).map((t) => (
              <PosterCard key={t.id} title={t} priority />
            ))}
          </div>
        ) : (
          <EmptyState text="Your list is empty. Tap + on any title to save it." />
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
      {text}
    </p>
  );
}

function EditProfileCard({ profile }) {
  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState(profile.color);
  const [kids, setKids] = useState(profile.kids);
  const [language, setLanguage] = useState(profile.language);

  const trimmed = name.trim();
  const changed =
    trimmed !== profile.name || color !== profile.color || kids !== profile.kids || language !== profile.language;

  const save = (e) => {
    e.preventDefault();
    if (!trimmed) return;
    updateProfile(profile.id, { name: trimmed.slice(0, 24), color, kids, language });
    toast.success("Profile saved", { description: trimmed });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar profile={{ name: trimmed || profile.name, color }} className="size-16 text-3xl" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!trimmed || undefined}
              />
              {!trimmed && <p className="text-xs text-destructive">Name can&apos;t be empty.</p>}
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Avatar color</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(avatarColors).map(([key, classes]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  aria-label={`${key} avatar`}
                  aria-pressed={color === key}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition",
                    classes,
                    color === key ? "ring-2 ring-foreground" : "hover:scale-110"
                  )}
                >
                  {color === key && <Check className="size-4" />}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-language">Preferred language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="profile-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {languages.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2.5">
              <div>
                <Label htmlFor="profile-kids">Kids profile</Label>
                <p className="text-xs text-muted-foreground">Shows titles rated 7+ only</p>
              </div>
              <Switch id="profile-kids" checked={kids} onCheckedChange={setKids} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!changed}
              onClick={() => {
                setName(profile.name);
                setColor(profile.color);
                setKids(profile.kids);
                setLanguage(profile.language);
              }}
            >
              Reset
            </Button>
            <Button type="submit" disabled={!changed || !trimmed} className="px-6">
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
