import type { Playback, Title } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, SkipForward } from "lucide-react";

/**
 * Watch page for titles whose video is an embed link (YouTube, Vimeo, Bunny Stream…): the
 * host's own player fills the screen. Titles with an HLS link use the site's player instead.
 */
export function EmbedWatch({ title, playback, url }: { title: Title; playback: Playback; url: string }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      <header className="flex items-center gap-3 px-3 py-2 md:px-5">
        <Link
          href={`/title/${title.id}`}
          aria-label={`Back to ${title.title}`}
          className="flex size-10 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{title.title}</h1>
          {playback.label && <p className="truncate text-xs text-white/60">{playback.label}</p>}
        </div>
        {playback.next && (
          <Link
            href={playback.next.href}
            className="flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-1.5 text-sm hover:border-white"
          >
            Next episode <SkipForward className="size-4" />
          </Link>
        )}
      </header>
      <iframe
        key={url}
        src={url}
        title={playback.label ? `${title.title} — ${playback.label}` : title.title}
        className="w-full flex-1 border-0"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
