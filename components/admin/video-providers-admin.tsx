"use client";

import type { ProviderRow } from "@/lib/server/video-sources";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateProviderAction } from "@/app/actions/title-videos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/**
 * The video hosts the site may play from (licensed hosts only). Turning one off hides all its
 * sources at once; priority orders sources from different hosts (lower plays first).
 */
export function VideoProvidersAdmin({ providers }: { providers: ProviderRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function update(id: string, patch: { enabled?: boolean; priority?: number | string }) {
    setBusy(id);
    try {
      const result = await updateProviderAction(id, patch);
      if (!result.ok) return void toast.error(result.error);
      toast.success(result.message);
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="mb-6">
      <CardContent>
        <h2 className="text-base font-semibold">Providers</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Hosts the site plays from. Turning one off hides all of its sources; lower priority plays first.
        </p>
        <ul className="divide-y divide-border">
          {providers.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <Switch
                checked={p.enabled}
                disabled={busy === p.id}
                onCheckedChange={(enabled) => update(p.id, { enabled })}
                aria-label={`${p.name} ${p.enabled ? "on" : "off"}`}
              />
              <span className="min-w-36 font-medium">{p.name}</span>
              <Badge variant="outline">{p.kind === "hls" ? "Site player" : "Embed"}</Badge>
              <span className="text-xs text-muted-foreground">
                {p.sources} source{p.sources === 1 ? "" : "s"}
              </span>
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                Priority
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  defaultValue={p.priority}
                  disabled={busy === p.id}
                  className="h-8 w-20"
                  onBlur={(e) => {
                    if (Number(e.target.value) !== p.priority) update(p.id, { priority: e.target.value });
                  }}
                />
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
