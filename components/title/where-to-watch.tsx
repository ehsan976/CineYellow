import type { WatchProvider, WatchProviders } from "@/lib/types";
import Image from "next/image";
import { MonitorPlay } from "lucide-react";

const GROUPS: { key: "stream" | "free" | "rent" | "buy"; label: string }[] = [
  { key: "stream", label: "Stream" },
  { key: "free", label: "Free" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
];

/** At most this many logos per group; the rest are on TMDB's page. */
const MAX_LOGOS = 8;

/**
 * Legal streaming services for this title in the site's region (TMDB watch providers, powered
 * by JustWatch). Logos link to TMDB's "Where to watch" page, which links on to each service.
 * Works in server and client components (no hooks).
 */
export function WhereToWatch({ providers }: { providers: WatchProviders | null }) {
  if (!providers) return null;
  const groups = GROUPS.map((g) => ({ ...g, items: providers[g.key] })).filter((g) => g.items.length);

  return (
    <section id="where-to-watch" aria-labelledby="where-to-watch-heading" className="scroll-mt-24 border-t border-border pt-3">
      <h3 id="where-to-watch-heading" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <MonitorPlay className="size-4" /> Where to watch
      </h3>
      <dl className="space-y-2.5">
        {groups.map((g) => (
          <div key={g.key}>
            <dt className="mb-1 text-xs text-muted-foreground">{g.label}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {g.items.slice(0, MAX_LOGOS).map((p) => (
                <ProviderLogo key={p.id} provider={p} href={providers.link} />
              ))}
            </dd>
          </div>
        ))}
      </dl>
      {/* TMDB's terms ask for JustWatch to be credited wherever this data is shown. */}
      <p className="mt-2.5 text-[11px] text-muted-foreground">
        {providers.region} availability · data by{" "}
        <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-primary hover:underline">
          JustWatch
        </a>
      </p>
    </section>
  );
}

function ProviderLogo({ provider, href }: { provider: WatchProvider; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={provider.name}
      aria-label={`${provider.name} (opens TMDB's where-to-watch page)`}
      className="block overflow-hidden rounded-md ring-1 ring-white/10 transition hover:ring-2 hover:ring-primary"
    >
      <Image src={provider.logo} alt="" width={36} height={36} className="size-9" />
    </a>
  );
}
