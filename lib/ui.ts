// Shared layout classes used by server and client components.
export const gridClass =
  "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

// Heading sizes for a title's name, smaller as the name gets longer, so real (often long) TMDB
// names stay below the navbar. Full class strings so Tailwind can see them.
const TITLE_SIZES = {
  hero: [
    "text-5xl sm:text-6xl md:text-7xl lg:text-8xl",
    "text-4xl sm:text-5xl md:text-6xl lg:text-7xl",
    "text-3xl sm:text-4xl md:text-5xl lg:text-6xl",
    "text-3xl sm:text-4xl md:text-5xl",
  ],
  page: [
    "text-5xl sm:text-6xl md:text-7xl",
    "text-4xl sm:text-5xl md:text-6xl",
    "text-3xl sm:text-4xl md:text-5xl",
    "text-3xl sm:text-4xl",
  ],
  /** The detail popup's heading. */
  dialog: ["text-4xl md:text-5xl", "text-3xl md:text-4xl", "text-2xl md:text-3xl", "text-xl md:text-2xl"],
  /** Names written over a landscape card's image. */
  card: ["text-xl md:text-2xl", "text-lg md:text-xl", "text-base md:text-lg", "text-sm md:text-base"],
} as const;

export function titleSizeClass(name: string, scale: keyof typeof TITLE_SIZES): string {
  const length = name.length;
  const step = length <= 14 ? 0 : length <= 28 ? 1 : length <= 45 ? 2 : 3;
  return TITLE_SIZES[scale][step];
}
