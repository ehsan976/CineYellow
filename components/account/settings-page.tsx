"use client";

import type { QualityPreference } from "@/lib/types";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { updateAccount } from "@/lib/stores/account-store";
import { setMyList } from "@/lib/stores/my-list-store";
import { qualityOptions, updatePlayerPrefs } from "@/lib/stores/player-prefs-store";
import { clearHistory } from "@/lib/stores/watch-history-store";
import { setAutoplayNext, useAutoplayNext } from "@/components/player/player-context";
import { useApp } from "@/components/providers/app-context";
import { useAccount, usePlayerPrefs } from "@/hooks/use-account";
import { PageHeading, SettingRow, SettingsCard, SettingsSkeleton } from "@/components/account/settings-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
// Language codes as streams report them (HLS / BCP 47). The player matches them to tracks with
// sameLanguage() (lib/languages.ts), so "ur" here also matches an admin subtitle stored as "urd".
const audioLanguages = {
  default: "Original audio",
  hi: "Hindi",
  ur: "Urdu",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ta: "Tamil",
  te: "Telugu",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
};
const subtitleLanguages = {
  off: "Off",
  en: "English",
  hi: "Hindi",
  ur: "Urdu",
  ar: "Arabic",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  nl: "Dutch",
};

const saved = () => toast.success("Settings saved");

function SettingSelect({
  id,
  value,
  onChange,
  options,
  className = "w-56",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {Object.entries(options).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SettingsPage() {
  const { hydrated, myList } = useApp();
  const prefs = usePlayerPrefs();
  const autoplayNext = useAutoplayNext();
  const { notifications } = useAccount();
  const [confirm, setConfirm] = useState(null); // "history" | "list" | null

  if (!hydrated) {
    return (
      <>
        <PageHeading title="Settings" />
        <SettingsSkeleton />
      </>
    );
  }

  const setNotification = (key, value) => {
    updateAccount({ notifications: { ...notifications, [key]: value } });
    saved();
  };

  const runConfirm = () => {
    if (confirm === "history") {
      clearHistory();
      toast.success("Watch history cleared");
    } else if (confirm === "list") {
      setMyList([]);
      toast.success("My List cleared");
    }
    setConfirm(null);
  };

  return (
    <>
      <PageHeading title="Settings" description="Changes save automatically and apply the next time you play something." />

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard title="Playback" description="How videos start and play.">
          <SettingRow label="Autoplay next episode" hint="Start the next episode when the credits roll." htmlFor="set-autoplay">
            <Switch
              id="set-autoplay"
              checked={autoplayNext}
              onCheckedChange={(v) => {
                setAutoplayNext(v);
                saved();
              }}
            />
          </SettingRow>
          <SettingRow label="Playback speed" hint="Default speed for new videos." htmlFor="set-speed">
            <SettingSelect
              id="set-speed"
              className="w-32"
              value={String(prefs.rate ?? 1)}
              onChange={(v) => {
                updatePlayerPrefs({ rate: Number(v) });
                saved();
              }}
              options={Object.fromEntries(speeds.map((s) => [String(s), s === 1 ? "1× (Normal)" : `${s}×`]))}
            />
          </SettingRow>
          <SettingRow label="Video quality" hint={qualityOptions[prefs.quality ?? "auto"].hint} htmlFor="set-quality">
            <SettingSelect
              id="set-quality"
              value={prefs.quality ?? "auto"}
              onChange={(v) => {
                updatePlayerPrefs({ quality: v === "auto" ? undefined : (v as QualityPreference) });
                saved();
              }}
              options={Object.fromEntries(Object.entries(qualityOptions).map(([k, o]) => [k, o.label]))}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard title="Audio & Subtitles" description="Used when the video has that language.">
          <SettingRow label="Audio language" htmlFor="set-audio">
            <SettingSelect
              id="set-audio"
              value={prefs.audioLanguage && audioLanguages[prefs.audioLanguage] ? prefs.audioLanguage : "default"}
              onChange={(v) => {
                updatePlayerPrefs({ audioLanguage: v === "default" ? undefined : v });
                saved();
              }}
              options={audioLanguages}
            />
          </SettingRow>
          <SettingRow label="Subtitles" htmlFor="set-subs">
            <SettingSelect
              id="set-subs"
              value={prefs.subtitleLanguage && subtitleLanguages[prefs.subtitleLanguage] ? prefs.subtitleLanguage : "off"}
              onChange={(v) => {
                updatePlayerPrefs({ subtitleLanguage: v });
                saved();
              }}
              options={subtitleLanguages}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard title="Notifications" description="What we tell you about.">
          <SettingRow label="New episodes" hint="When a show in My List gets a new episode." htmlFor="set-n-episodes">
            <Switch id="set-n-episodes" checked={notifications.newEpisodes} onCheckedChange={(v) => setNotification("newEpisodes", v)} />
          </SettingRow>
          <SettingRow label="Recommendations" hint="Titles picked for you." htmlFor="set-n-recs">
            <Switch id="set-n-recs" checked={notifications.recommendations} onCheckedChange={(v) => setNotification("recommendations", v)} />
          </SettingRow>
          <SettingRow label="Email updates" hint="News and offers by email." htmlFor="set-n-email">
            <Switch id="set-n-email" checked={notifications.emailUpdates} onCheckedChange={(v) => setNotification("emailUpdates", v)} />
          </SettingRow>
        </SettingsCard>

        <SettingsCard title="Privacy & data" description="Stored in this browser only.">
          <SettingRow label="Watch history" hint="Clears Continue Watching and resume positions.">
            <Button variant="outline" onClick={() => setConfirm("history")}>
              <Trash2 /> Clear history
            </Button>
          </SettingRow>
          <SettingRow label="My List" hint={`${myList.length} saved title${myList.length === 1 ? "" : "s"}.`}>
            <Button variant="outline" disabled={!myList.length} onClick={() => setConfirm("list")}>
              <Trash2 /> Clear My List
            </Button>
          </SettingRow>
        </SettingsCard>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === "list" ? "Clear My List?" : "Clear watch history?"}</DialogTitle>
            <DialogDescription>
              {confirm === "list"
                ? "All saved titles will be removed from My List."
                : "Continue Watching and all resume positions will be removed."}{" "}
              This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={runConfirm}>
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
