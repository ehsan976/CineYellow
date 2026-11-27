import { describe, expect, it } from "vitest";

import { aniskipTarget } from "@/lib/anilist/aniskip";
import { sameLanguage } from "@/lib/languages";
import { oembedUrl, parseHlsManifest } from "@/lib/video-providers/health";
import { isKidsFriendly, runtimeToSeconds } from "@/lib/titles";
import { isAnime, toEpisodes } from "@/lib/tmdb/map";
import { checkSubtitles, checkVideoUrl, providerIdFor } from "@/lib/videos";
import { getEmbedWatchOptions } from "@/lib/player/embed-providers";
import { releaseNotice, type ReleaseInfo } from "@/lib/releases";
import type { Title } from "@/lib/types";

const seasons = (list: [number, number | null, boolean][]) =>
  list.map(([malId, episodes, released], i) => ({ anilistId: i, malId, episodes, released }));

describe("aniskipTarget (TMDB season/episode → MAL entry)", () => {
  const demonSlayer = seasons([[38000, 26, true], [49926, 7, true], [47778, 11, true], [51019, 11, true], [55701, 8, true]]);
  const frieren = seasons([[52991, 28, true], [59978, 10, true], [63816, null, false]]);
  const onePiece = seasons([[21, null, true]]);
  const aot = seasons([[16498, 25, true], [25777, 12, true], [35760, 12, true], [38524, 10, true]]);

  it("maps matching seasons", () => expect(aniskipTarget(demonSlayer, [26, 7, 11, 11, 8], 3, 2)).toEqual({ malId: 47778, episode: 2 }));
  it("splits a TMDB season over two AniList cours", () => expect(aniskipTarget(frieren, [38], 1, 30)).toEqual({ malId: 59978, episode: 2 }));
  it("uses absolute numbers for one long entry", () => expect(aniskipTarget(onePiece, [61, 16, 14], 2, 1)).toEqual({ malId: 21, episode: 62 }));
  it("finds a later part of a season", () => expect(aniskipTarget(aot, [25, 12, 22, 28], 3, 15)).toEqual({ malId: 38524, episode: 3 }));
  it("gives up past what AniList lists", () => expect(aniskipTarget(aot, [25, 12, 22, 28], 4, 1)).toBeNull());
});

describe("sameLanguage", () => {
  it.each([["en", "eng"], ["eng", "en-US"], ["ur", "urd"], ["zh", "chi"], ["fr", "fre"], ["ja", "jpn"]])("%s = %s", (a, b) =>
    expect(sameLanguage(a, b)).toBe(true)
  );
  it("tells languages apart", () => expect(sameLanguage("en", "hin")).toBe(false));
  it("never matches 'off'", () => expect(sameLanguage("off", "en")).toBe(false));
});

describe("video links", () => {
  it("accepts HLS and assigns own-hls", () => {
    const c = checkVideoUrl("https://cdn.example.com/a/master.m3u8");
    expect(c).toMatchObject({ ok: true, kind: "hls" });
    expect(providerIdFor("hls", c.url)).toBe("own-hls");
  });
  it("normalises a YouTube watch link to the privacy embed", () => {
    const c = checkVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(c).toMatchObject({ ok: true, kind: "embed", url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
    expect(providerIdFor("embed", c.url)).toBe("youtube");
  });
  it.each([
    "https://embed.vidrift.net/embed/movie/438631",
    "https://vidsrc.to/embed/movie/550",
    "https://2embed.cc/embed/550",
    "https://player.vidzee.wtf/embed/movie/438631?sr=6",
    "https://vidsrc.sh/embed/movie/438631",
    "https://www.viduki.net/1/movie/438631",
    "https://watch.embed-api.stream/embed/movie/438631",
  ])("accepts known streaming embed %s", (url) => {
    expect(checkVideoUrl(url).ok).toBe(true);
  });
  it("puts VidRift first as English and includes Hindi embed options", () => {
    const opts = getEmbedWatchOptions({ titleId: "movie-438631" });
    expect(opts[0]).toMatchObject({ providerId: "vidrift", language: "english" });
    expect(opts.some((o) => o.language === "hindi")).toBe(true);
  });
  it("hides disabled servers, demotes reported servers, and falls back to healthy mirrors when down", () => {
    const opts = getEmbedWatchOptions({
      titleId: "movie-438631",
      states: {
        vidrift: { enabled: false, priority: 10, status: "online", latencyMs: 120, failCount: 0, reportCount: 0 },
        vidlink: { enabled: true, priority: 20, status: "online", latencyMs: 150, failCount: 0, reportCount: 3 },
        "vidsrc-to": { enabled: true, priority: 40, status: "down", latencyMs: null, failCount: 3, reportCount: 0 },
        "vidsrc-sh": { enabled: true, priority: 120, status: "online", latencyMs: 210, failCount: 0, reportCount: 0 },
      },
    });
    expect(opts.some((o) => o.providerId === "vidrift")).toBe(false);
    // vidsrc-to was down, so it falls back to vidsrc-sh's URL and becomes healthy
    const vidsrcTo = opts.find((o) => o.providerId === "vidsrc-to");
    expect(vidsrcTo?.embedUrl).toBe("https://vidsrc.sh/embed/movie/438631");
    expect(vidsrcTo?.health?.fallbackFrom).toBe("VidSrc.to");
    // vidlink has 3 reports, so it is demoted after clean servers like cinesrc
    const cinesrcIdx = opts.findIndex((o) => o.providerId === "cinesrc");
    const vidlinkIdx = opts.findIndex((o) => o.providerId === "vidlink");
    expect(cinesrcIdx).toBeLessThan(vidlinkIdx);
  });
  it.each(["https://malicious-random-site.com/video.html", "http://cdn.example.com/a.m3u8"])("rejects %s", (url) =>
    expect(checkVideoUrl(url).ok).toBe(false)
  );
  it("only accepts https .vtt subtitles with a language", () => {
    expect(checkSubtitles([{ lang: "ur", url: "https://cdn.example.com/s.ur.vtt" }])).toMatchObject({ ok: true, tracks: [{ lang: "urd", label: "Urdu" }] });
    expect(checkSubtitles([{ lang: "xx1", url: "https://cdn.example.com/s.vtt" }]).ok).toBe(false);
    expect(checkSubtitles([{ lang: "en", url: "https://cdn.example.com/s.srt" }]).ok).toBe(false);
  });
});

describe("health check parsing", () => {
  const master = [
    "#EXTM3U",
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",LANGUAGE="hi",NAME="Hindi"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",LANGUAGE="en",NAME="English"',
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="ur",NAME="Urdu"',
    "#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=1280x720",
    "720p.m3u8",
    "#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080",
    "1080p.m3u8",
  ].join("\n");

  it("reads audio languages and the tallest rendition", () =>
    expect(parseHlsManifest(master)).toEqual({ valid: true, audioLanguages: ["hin", "eng"], maxHeight: 1080 }));
  it("rejects something that isn't a playlist", () => expect(parseHlsManifest("<html>").valid).toBe(false));
  it("builds official oEmbed URLs", () => {
    expect(oembedUrl("youtube", "https://www.youtube-nocookie.com/embed/abc123def45")).toContain("youtube.com/oembed");
    expect(oembedUrl("vimeo", "https://player.vimeo.com/video/123?h=abc")).toContain(encodeURIComponent("https://vimeo.com/123/abc"));
    expect(oembedUrl("bunny", "https://iframe.mediadelivery.net/embed/1/x")).toBeNull();
  });
});

describe("catalog rules", () => {
  it("counts Japanese, Korean and Chinese animation as anime", () => {
    expect(isAnime([16], { original_language: "ja" })).toBe(true);
    expect(isAnime([16], { original_language: "ko" })).toBe(true);
    expect(isAnime([16], { original_language: "en", origin_country: ["CN"] })).toBe(true);
    expect(isAnime([16], { original_language: "en", origin_country: ["US"] })).toBe(false);
    expect(isAnime([18], { original_language: "ja" })).toBe(false);
  });

  it("keeps TMDB's episode numbers (gaps, duplicates, episode 0)", () => {
    const title = { id: "tv-1", image: "", description: "" } as Title;
    const eps = toEpisodes(
      [{ episode_number: 3 }, { episode_number: 1 }, { episode_number: 3 }, { episode_number: 0 }, { episode_number: 5 }],
      title,
      1
    );
    expect(eps.map((e) => e.number)).toEqual([1, 3, 5]);
  });

  it("lets Kids profiles play All and 7+ only", () => {
    expect(isKidsFriendly("All")).toBe(true);
    expect(isKidsFriendly("7+")).toBe(true);
    for (const r of ["13+", "16+", "18+", "NR", "", null]) expect(isKidsFriendly(r)).toBe(false);
  });
});

describe("My List release reminders", () => {
  const show = (last: string | null, next: string | null): ReleaseInfo => ({
    id: "tv-1399",
    media: "tv",
    releaseDate: null,
    lastEpisode: last ? { season: 2, episode: 5, airDate: last } : null,
    nextEpisode: next ? { season: 2, episode: 6, airDate: next } : null,
  });
  const movie = (date: string | null): ReleaseInfo => ({ id: "movie-1", media: "movie", releaseDate: date, lastEpisode: null, nextEpisode: null });
  const today = "2026-11-26";

  it("a show's episode from this week is new", () => {
    const n = releaseNotice(show("2026-11-24", "2026-12-01"), today);
    expect(n?.label).toBe("New Episode");
    expect(n?.detail).toContain("S2:E5");
    expect(n?.time).toBe("2 days ago");
  });
  it("otherwise the next episode within two weeks is coming soon", () => {
    const n = releaseNotice(show("2026-11-01", "2026-11-29"), today);
    expect(n?.label).toBe("Coming Soon");
    expect(n?.detail).toContain("S2:E6 airs Sun 29 Nov");
    expect(n?.time).toBe("In 3 days");
  });
  it("nothing for a show with no recent or close episode", () => expect(releaseNotice(show("2026-10-01", "2027-02-01"), today)).toBeNull());
  it("a movie releasing within 60 days is coming soon", () => expect(releaseNotice(movie("2026-12-12"), today)?.label).toBe("Coming Soon"));
  it("a movie released this week is out now", () => expect(releaseNotice(movie("2026-11-26"), today)).toMatchObject({ label: "Out Now", time: "Today" }));
  it("nothing for old or far-off movies, or no date", () => {
    expect(releaseNotice(movie("2026-01-01"), today)).toBeNull();
    expect(releaseNotice(movie("2027-06-01"), today)).toBeNull();
    expect(releaseNotice(movie(null), today)).toBeNull();
  });
  it("each new episode gets its own read key", () =>
    expect(releaseNotice(show("2026-11-24", null), today)?.readKey).not.toBe(releaseNotice(show(null, "2026-11-29"), today)?.readKey));
});

describe("runtimeToSeconds (Continue Watching estimate for embeds)", () => {
  it("reads movie and episode runtimes", () => {
    expect(runtimeToSeconds("2h 14m")).toBe(8040);
    expect(runtimeToSeconds("45m")).toBe(2700);
    expect(runtimeToSeconds("1h 00m")).toBe(3600);
  });
  it("unknown → null", () => {
    expect(runtimeToSeconds("")).toBeNull();
    expect(runtimeToSeconds(null)).toBeNull();
    expect(runtimeToSeconds("soon")).toBeNull();
    expect(runtimeToSeconds("0m")).toBeNull();
  });
});
