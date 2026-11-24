// Pulls audio and subtitle languages out of a Movie of the Night show response.
// Defensive on purpose: the exact field shapes aren't fully documented, so several forms are
// accepted and anything unrecognised is ignored. Streaming services and links are not used.
import { normalizeLanguageCode, sortLanguages } from "@/lib/languages";

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

/** "hin" | { language: "hin" } | { locale: { language: "hin", region: "IN" } } → "hin". */
function codeOf(entry: unknown): string | null {
  if (typeof entry === "string") return normalizeLanguageCode(entry);
  if (!isObject(entry)) return null;
  if (typeof entry.language === "string") return normalizeLanguageCode(entry.language);
  if (isObject(entry.locale) && typeof entry.locale.language === "string") return normalizeLanguageCode(entry.locale.language);
  if (typeof entry.locale === "string") return normalizeLanguageCode(entry.locale);
  return null;
}

function optionsFor(json: unknown, country: string): unknown[] {
  if (!isObject(json)) return [];
  const so = json.streamingOptions ?? json.streamingInfo;
  if (Array.isArray(so)) return so;
  if (!isObject(so)) return [];
  const forCountry = so[country] ?? so[country.toUpperCase()];
  return Array.isArray(forCountry) ? forCountry : [];
}

export function parseShowLanguages(json: unknown, country: string): { audio: string[]; subtitles: string[] } {
  const audio = new Set<string>();
  const subtitles = new Set<string>();
  for (const option of optionsFor(json, country)) {
    if (!isObject(option)) continue;
    const audios = option.audios ?? option.audio ?? [];
    for (const entry of Array.isArray(audios) ? audios : []) {
      const code = codeOf(entry);
      if (code) audio.add(code);
    }
    const subs = option.subtitles ?? [];
    for (const entry of Array.isArray(subs) ? subs : []) {
      const code = codeOf(entry);
      if (code) subtitles.add(code);
    }
  }
  return { audio: sortLanguages(audio), subtitles: sortLanguages(subtitles) };
}
