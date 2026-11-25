import type { Title, WatchProviders } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";

/**
 * Shown by the watch page instead of a player when CineYellow has no video for the title (or for
 * this episode). Points to the services that legally stream it in the site's region, from TMDB's
 * watch providers (JustWatch data), when there are any.
 */
export function NotOnCineYellow({
  title,
  providers,
  episodeOnly,
}: {
  title: Title;
  providers: WatchProviders | null;
  /** The show has other episodes here, just not this one. */
  episodeOnly: boolean;
}) {
  const services = providers ? [...providers.stream, ...providers.free] : [];
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-black px-6 py-10 text-center text-white">
      <h1 className="max-w-xl text-2xl font-bold text-balance sm:text-3xl">
        {episodeOnly ? `This episode of ${title.title} isn't on CineYellow yet` : `${title.title} isn't on CineYellow yet`}
      </h1>
      {services.length > 0 ? (
        <div className="space-y-3">
          <p className="text-white/70">You can stream it on:</p>
          <ul className="flex flex-wrap justify-center gap-3">
            {services.slice(0, 8).map((p) => (
              <li key={p.id}>
                <a
                  href={providers.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-white/10 py-1.5 pr-3 pl-1.5 text-sm hover:bg-white/20"
                >
                  <Image src={p.logo} alt="" width={28} height={28} className="size-7 rounded" />
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-white/50">
            {providers.region} availability · data by{" "}
            <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
              JustWatch
            </a>
          </p>
        </div>
      ) : (
        <p className="max-w-md text-white/70">We&apos;ll add it as soon as it&apos;s available here.</p>
      )}
      <div className="flex gap-3">
        <Link href={`/title/${title.id}`} className="rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/85">
          Back to {title.type === "movie" ? "movie" : "show"}
        </Link>
        <Link href="/" className="rounded-md bg-white/15 px-5 py-2.5 font-semibold hover:bg-white/25">
          Home
        </Link>
      </div>
    </div>
  );
}
