"use client";

import { Check, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/app-context";

/** Round "+ / ✓" button that adds or removes a title from My List. */
export function ListButton({
  titleId,
  name,
  className,
  size = "sm",
}: {
  titleId: string;
  /** Title name for the "Added to My List" toast. */
  name?: string;
  className?: string;
  size?: "sm" | "lg";
}) {
  const { isInList, toggleList } = useApp();
  const inList = isInList(titleId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleList(titleId, name);
      }}
      aria-label={inList ? "Remove from My List" : "Add to My List"}
      aria-pressed={inList}
      title={inList ? "Remove from My List" : "Add to My List"}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2 backdrop-blur transition-all focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        size === "sm" ? "size-8 [&_svg]:size-4" : "size-11 [&_svg]:size-5",
        inList
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/70 bg-black/50 text-white hover:border-primary hover:text-primary",
        className
      )}
    >
      {inList ? <Check strokeWidth={3} /> : <Plus strokeWidth={2.5} />}
    </button>
  );
}
