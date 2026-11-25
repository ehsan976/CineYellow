// Health check for one video source, by its provider's method (video_provider.health_method):
// - "manifest": fetch the HLS playlist; it must be an #EXTM3U file. From a master playlist we also
//   read the audio languages (#EXT-X-MEDIA TYPE=AUDIO) and the tallest rendition (RESOLUTION).
// - "oembed": ask the host's official oEmbed endpoint whether the video exists and is public.
// - "none": nothing to check (signed players like Bunny/Cloudflare/Mux).
// Rules (borrowed as ideas from the reference repos): 401/403 from a stream host is "advisory"
// (signed URLs often refuse a bare request) and not a failure; only real errors count.
import "server-only";
import { normalizeLanguageCode } from "@/lib/languages";
import { BlockedUrlError, safeFetch } from "@/lib/server/safe-fetch";

export type HealthMethod = "manifest" | "oembed" | "none";

export interface HealthResult {
  /** "ok", "failed", "advisory" (inconclusive: don't count it either way) or "skipped". */
  outcome: "ok" | "failed" | "advisory" | "skipped";
  httpStatus: number | null;
  ms: number | null;
  error: string | null;
  /** From an HLS master playlist (ISO 639-2), when present. */
  audioLanguages?: string[];
  maxHeight?: number | null;
}

/** Audio languages and the tallest rendition in an HLS master playlist. Pure; exported for tests. */
export function parseHlsManifest(text: string): { valid: boolean; audioLanguages: string[]; maxHeight: number | null } {
  const valid = text.trimStart().startsWith("#EXTM3U");
  const audio = new Set<string>();
  let maxHeight: number | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("#EXT-X-MEDIA:") && /TYPE=AUDIO/.test(line)) {
      const lang = /LANGUAGE="([^"]+)"/.exec(line)?.[1];
      const code = lang && normalizeLanguageCode(lang);
      if (code) audio.add(code);
    } else if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const height = Number(/RESOLUTION=\d+x(\d+)/.exec(line)?.[1]);
      if (height > 0 && (maxHeight === null || height > maxHeight)) maxHeight = height;
    }
  }
  return { valid, audioLanguages: [...audio], maxHeight };
}

/** The host's official oEmbed endpoint for a (normalised) embed URL; null when unknown. */
export function oembedUrl(providerId: string, embedUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(embedUrl);
  } catch {
    return null;
  }
  const parts = u.pathname.split("/").filter(Boolean);
  if (providerId === "youtube") {
    const id = parts[0] === "embed" ? parts[1] : null;
    return id ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}` : null;
  }
  if (providerId === "vimeo") {
    const id = parts[0] === "video" ? parts[1] : null;
    const h = u.searchParams.get("h");
    return id ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}${h ? `/${h}` : ""}`)}` : null;
  }
  if (providerId === "dailymotion") {
    const id = parts[0] === "embed" && parts[1] === "video" ? parts[2] : null;
    return id ? `https://www.dailymotion.com/services/oembed?format=json&url=${encodeURIComponent(`https://www.dailymotion.com/video/${id}`)}` : null;
  }
  return null;
}

const OEMBED_HOSTS = ["youtube.com", "vimeo.com", "dailymotion.com"];

export async function checkSourceHealth(source: {
  url: string;
  providerId: string;
  method: HealthMethod;
  /** Hosts the provider serves from ([] = any public host). */
  hosts: string[];
}): Promise<HealthResult> {
  if (source.method === "none") return { outcome: "skipped", httpStatus: null, ms: null, error: null };
  try {
    if (source.method === "manifest") {
      const res = await safeFetch(source.url, { allowedHosts: source.hosts, accept: "application/vnd.apple.mpegurl, */*" });
      if (res.status === 401 || res.status === 403) {
        return { outcome: "advisory", httpStatus: res.status, ms: res.ms, error: `HTTP ${res.status} (signed URL?)` };
      }
      if (res.status >= 300 && res.status < 400) {
        return { outcome: "failed", httpStatus: res.status, ms: res.ms, error: "redirects are not followed; use the final URL" };
      }
      if (res.status !== 200) return { outcome: "failed", httpStatus: res.status, ms: res.ms, error: `HTTP ${res.status}` };
      const parsed = parseHlsManifest(res.text);
      if (!parsed.valid) return { outcome: "failed", httpStatus: 200, ms: res.ms, error: "not an HLS playlist" };
      return { outcome: "ok", httpStatus: 200, ms: res.ms, error: null, audioLanguages: parsed.audioLanguages, maxHeight: parsed.maxHeight };
    }

    const endpoint = oembedUrl(source.providerId, source.url);
    if (!endpoint) return { outcome: "skipped", httpStatus: null, ms: null, error: "no oEmbed endpoint for this link" };
    const res = await safeFetch(endpoint, { allowedHosts: OEMBED_HOSTS, accept: "application/json", maxBytes: 100_000 });
    if (res.status === 200) return { outcome: "ok", httpStatus: 200, ms: res.ms, error: null };
    // 404: deleted. 401/403: private or embedding turned off. Either way it won't play.
    if (res.status === 404 || res.status === 401 || res.status === 403) {
      return { outcome: "failed", httpStatus: res.status, ms: res.ms, error: res.status === 404 ? "video not found" : "video is private or can't be embedded" };
    }
    return { outcome: "advisory", httpStatus: res.status, ms: res.ms, error: `oEmbed HTTP ${res.status}` };
  } catch (error) {
    if (error instanceof BlockedUrlError) return { outcome: "failed", httpStatus: null, ms: null, error: error.message };
    // Timeout / network: counts as a failure (several in a row mark the source broken).
    return { outcome: "failed", httpStatus: null, ms: null, error: error instanceof Error ? error.message.slice(0, 200) : "request failed" };
  }
}
