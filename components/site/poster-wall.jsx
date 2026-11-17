import Image from "next/image";

import { cn } from "@/lib/utils";
import { titles } from "@/lib/catalog";

const wall = titles.slice(0, 40);

/**
 * Tilted collage of posters used behind the landing hero and the sign-in pages.
 * The whole wall is visible on first paint and any poster can end up as the LCP element
 * (depends on the viewport), so load them eagerly — Next.js recommends `loading="eager"`
 * over `preload` in that case.
 */
export function PosterWall({ className }) {
  return (
    <div aria-hidden className={cn("overflow-hidden", className)}>
      <div className="absolute -inset-[12%] grid -rotate-[8deg] grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-9">
        {wall.map((t) => (
          <div key={t.id} className="relative aspect-2/3 overflow-hidden rounded-sm">
            <Image
              src={t.poster}
              alt=""
              fill
              sizes="(max-width: 640px) 20vw, 12vw"
              loading="eager"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
