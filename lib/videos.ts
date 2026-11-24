// Video links an admin attaches to a title or episode (see lib/server/title-videos.ts).
// Safe to import anywhere.
//
// - "hls": an https .m3u8 stream. Plays in the site's own player.
// - "embed": the player page of a video host, shown in an iframe. Only these hosts are accepted,
//   so the site can't be pointed at unlicensed "free movie" embed sites. Upload the videos you
//   have the rights to to one of them (or serve your own HLS) and paste the link here.

export type VideoKind = "hls" | "embed";

/** Hosts whose embed players may be shown. */
export const EMBED_HOSTS = [
  "YouTube",
  "Vimeo",
  "Bunny Stream",
  "Cloudflare Stream",
  "Mux",
  "Dailymotion",
] as const;

const YT_ID = /^[\w-]{6,20}$/;

/** Turns a watch/share URL into the host's embed URL. null when the host isn't allowed. */
function toEmbedUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  // YouTube: watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID, /live/ID
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? parts[0]
        : url.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null);
    return id && YT_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  // Vimeo: vimeo.com/123456 or player.vimeo.com/video/123456 (keeps ?h= for unlisted videos)
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = host === "vimeo.com" ? parts[0] : parts[0] === "video" ? parts[1] : null;
    if (!id || !/^\d+$/.test(id)) return null;
    const h = url.searchParams.get("h") ?? (host === "vimeo.com" && /^[0-9a-f]+$/i.test(parts[1] ?? "") ? parts[1] : null);
    return `https://player.vimeo.com/video/${id}${h ? `?h=${encodeURIComponent(h)}` : ""}`;
  }
  // Bunny Stream: iframe.mediadelivery.net/embed/{library}/{video} (or /play/…)
  if (host === "iframe.mediadelivery.net" || host === "player.mediadelivery.net") {
    if (parts.length >= 3 && (parts[0] === "embed" || parts[0] === "play") && /^\d+$/.test(parts[1])) {
      return `https://iframe.mediadelivery.net/embed/${parts[1]}/${encodeURIComponent(parts[2])}`;
    }
    return null;
  }
  // Cloudflare Stream: iframe.videodelivery.net/{id} or customer-xxx.cloudflarestream.com/{id}/iframe
  if (host === "iframe.videodelivery.net" || /^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(host)) {
    const id = parts[0];
    return id && /^[a-f0-9]{32}$/i.test(id) ? `https://${host}/${id}${host.startsWith("customer-") ? "/iframe" : ""}` : null;
  }
  // Mux Player: player.mux.com/{playbackId}
  if (host === "player.mux.com") {
    return parts[0] && /^[\w]{10,80}$/.test(parts[0]) ? `https://player.mux.com/${parts[0]}` : null;
  }
  // Dailymotion: dailymotion.com/video/ID, dai.ly/ID, dailymotion.com/embed/video/ID
  if (host === "dailymotion.com" || host === "dai.ly" || host === "geo.dailymotion.com") {
    const id =
      host === "dai.ly"
        ? parts[0]
        : parts[0] === "video"
          ? parts[1]
          : parts[0] === "embed" && parts[1] === "video"
            ? parts[2]
            : url.searchParams.get("video");
    return id && /^[a-z0-9]+$/i.test(id) ? `https://www.dailymotion.com/embed/video/${id}` : null;
  }
  return null;
}

/** ok → kind + normalised url; otherwise error (one shape: this project builds without strict mode). */
export type CheckedVideoUrl = { ok: boolean; kind?: VideoKind; url?: string; error?: string };

/** Validates a pasted link and normalises it (watch links become embed links). */
export function checkVideoUrl(raw: string, kind?: VideoKind): CheckedVideoUrl {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "That isn't a valid link." };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Use an https:// link." };
  if (raw.length > 1000) return { ok: false, error: "That link is too long." };

  const isHls = /\.m3u8$/i.test(url.pathname);
  if (kind !== "embed" && isHls) return { ok: true, kind: "hls", url: url.toString() };
  if (kind === "hls") return { ok: false, error: "An HLS link must end in .m3u8." };

  const embed = toEmbedUrl(url);
  if (embed) return { ok: true, kind: "embed", url: embed };
  return {
    ok: false,
    error: `Use an .m3u8 stream, or a video from ${EMBED_HOSTS.join(", ")}.`,
  };
}

/** For links stored before a rule changed: is this still an allowed embed URL? */
export function isAllowedEmbedUrl(url: string): boolean {
  const checked = checkVideoUrl(url, "embed");
  return checked.ok && checked.url === url;
}

/** Playback key, like watch_history: "movie-550", "tv-1399" (whole show) or "tv-1399:s1e3". */
export function videoKey(titleId: string, season?: number | null, episode?: number | null): string {
  return season && episode ? `${titleId}:s${season}e${episode}` : titleId;
}
