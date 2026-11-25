// Language codes → names. Movie of the Night reports audio/subtitle languages as ISO 639-2
// (three letters, e.g. "hin"); we store them that way and turn them into names for display.
// Safe to import anywhere.

const NAMES: Record<string, string> = {
  // South Asia
  hin: "Hindi", urd: "Urdu", tam: "Tamil", tel: "Telugu", mal: "Malayalam", kan: "Kannada",
  ben: "Bengali", mar: "Marathi", guj: "Gujarati", pan: "Punjabi", ori: "Odia", ory: "Odia",
  asm: "Assamese", nep: "Nepali", sin: "Sinhala", pus: "Pashto", snd: "Sindhi",
  // Common
  eng: "English", spa: "Spanish", por: "Portuguese", fra: "French", fre: "French",
  deu: "German", ger: "German", ita: "Italian", rus: "Russian", jpn: "Japanese", kor: "Korean",
  zho: "Chinese", chi: "Chinese", cmn: "Mandarin", yue: "Cantonese", ara: "Arabic", tur: "Turkish",
  fas: "Persian", per: "Persian", tha: "Thai", vie: "Vietnamese", ind: "Indonesian",
  msa: "Malay", may: "Malay", fil: "Filipino", tgl: "Tagalog", pol: "Polish", nld: "Dutch",
  dut: "Dutch", swe: "Swedish", nor: "Norwegian", nob: "Norwegian Bokmål", dan: "Danish",
  fin: "Finnish", hun: "Hungarian", ces: "Czech", cze: "Czech", slk: "Slovak", slo: "Slovak",
  ron: "Romanian", rum: "Romanian", ell: "Greek", gre: "Greek", heb: "Hebrew", ukr: "Ukrainian",
  bul: "Bulgarian", hrv: "Croatian", srp: "Serbian", slv: "Slovenian", est: "Estonian",
  lav: "Latvian", lit: "Lithuanian", cat: "Catalan", eus: "Basque", baq: "Basque", glg: "Galician",
  isl: "Icelandic", ice: "Icelandic", swa: "Swahili", afr: "Afrikaans", zul: "Zulu",
};

// ISO 639-1 (two letters) → ISO 639-2, for sources that send short codes.
const FROM_639_1: Record<string, string> = {
  hi: "hin", ur: "urd", ta: "tam", te: "tel", ml: "mal", kn: "kan", bn: "ben", mr: "mar",
  gu: "guj", pa: "pan", or: "ori", as: "asm", ne: "nep", si: "sin", ps: "pus", sd: "snd",
  en: "eng", es: "spa", pt: "por", fr: "fra", de: "deu", it: "ita", ru: "rus", ja: "jpn",
  ko: "kor", zh: "zho", ar: "ara", tr: "tur", fa: "fas", th: "tha", vi: "vie", id: "ind",
  ms: "msa", tl: "tgl", pl: "pol", nl: "nld", sv: "swe", no: "nor", nb: "nob", da: "dan",
  fi: "fin", hu: "hun", cs: "ces", sk: "slk", ro: "ron", el: "ell", he: "heb", uk: "ukr",
  bg: "bul", hr: "hrv", sr: "srp", sl: "slv", et: "est", lv: "lav", lt: "lit", ca: "cat",
  eu: "eus", gl: "glg", is: "isl", sw: "swa", af: "afr", zu: "zul",
};

/** Lower-cases, drops a region ("hin-IN", "pt_BR") and converts 2-letter codes. null if unusable. */
export function normalizeLanguageCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const base = raw.trim().toLowerCase().split(/[-_]/)[0];
  if (/^[a-z]{2}$/.test(base)) return FROM_639_1[base] ?? null;
  return /^[a-z]{3}$/.test(base) ? base : null;
}

/**
 * Do two language tags mean the same language? Different parts of the site write the same
 * language differently: streams say "en" or "eng" or "en-US", admin subtitles store "eng",
 * Settings stores "en". Compare their ISO 639-2 forms; fall back to exact text otherwise.
 */
export function sameLanguage(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const ca = canonical(normalizeLanguageCode(a));
  const cb = canonical(normalizeLanguageCode(b));
  return ca && cb ? ca === cb : a.trim().toLowerCase() === b.trim().toLowerCase();
}

// ISO 639-2 has two codes for some languages ("B" and "T"); treat them as one.
const B_TO_T: Record<string, string> = {
  chi: "zho", fre: "fra", ger: "deu", dut: "nld", per: "fas", may: "msa", cze: "ces",
  slo: "slk", rum: "ron", gre: "ell", baq: "eus", ice: "isl", ori: "ory",
};
const canonical = (code: string | null) => (code ? (B_TO_T[code] ?? code) : null);

export function isLanguageCode(code: unknown): code is string {
  return typeof code === "string" && /^[a-z]{3}$/.test(code);
}

export function languageName(code: string): string {
  const known = NAMES[code];
  if (known) return known;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    if (name && name.toLowerCase() !== code) return name;
  } catch {
    // Unknown to Intl as well
  }
  return code.toUpperCase();
}

const FIRST = ["hin", "urd", "eng"];

/** De-duplicated, Hindi/Urdu/English first, then alphabetical by name. */
export function sortLanguages(codes: Iterable<string>): string[] {
  return [...new Set(codes)].sort((a, b) => {
    const ai = FIRST.indexOf(a);
    const bi = FIRST.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return languageName(a).localeCompare(languageName(b));
  });
}

/** Offered as quick picks in the admin editor. */
export const COMMON_LANGUAGE_CODES = [
  "hin", "urd", "eng", "tam", "tel", "mal", "kan", "ben", "mar", "pan", "guj",
  "jpn", "kor", "spa", "fra", "deu", "ita", "por", "ara", "tur", "zho", "rus",
];
