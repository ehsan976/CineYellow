"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * next/image for TMDB artwork on cards, with a fallback chain: if the optimised copy fails (the
 * optimizer can time out on a cold image, or hit its plan limit), load TMDB's own sized file
 * directly; if that fails too, show `fallback` (a placeholder). A broken-image icon never shows.
 */
export function CardImage({
  src,
  alt,
  fallback,
  mobileSrc,
  ...props
}: Omit<ImageProps, "src" | "onError"> & {
  src: string;
  fallback: string;
  /** Different artwork below md (e.g. a portrait poster on phones); only one of the two downloads. */
  mobileSrc?: string;
}) {
  const [stage, setStage] = useState<"optimized" | "direct" | "fallback">("optimized");
  const isRemote = /^https?:\/\//.test(src);
  const image = (
    <Image
      {...props}
      alt={alt}
      src={stage === "fallback" ? fallback : src}
      unoptimized={stage !== "optimized" || props.unoptimized}
      onError={() => setStage((s) => (s === "optimized" && isRemote ? "direct" : "fallback"))}
    />
  );
  if (!mobileSrc || stage === "fallback") return image;
  // The <picture> fills the card itself, so the `fill` image's parent is positioned (next/image checks).
  return (
    <picture className="absolute inset-0">
      <source media="(max-width: 767px)" srcSet={mobileSrc} />
      {image}
    </picture>
  );
}
