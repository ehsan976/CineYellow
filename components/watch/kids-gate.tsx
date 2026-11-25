"use client";

import type { Title } from "@/lib/types";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { isKidsFriendly } from "@/lib/titles";
import { useProfiles } from "@/hooks/use-profile";

/**
 * On a Kids profile, titles rated above 7+ (or not rated) don't play: this shows a message
 * instead of `children`. Other profiles see `children` unchanged.
 * (The active profile lives in the browser, so the check happens here, not on the server.)
 */
export function KidsGate({ title, children }: { title: Title; children: React.ReactNode }) {
  const { active } = useProfiles();
  if (!active?.kids || isKidsFriendly(title.rating)) return children;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
      <ShieldCheck className="size-12 text-primary" />
      <h1 className="max-w-xl text-2xl font-bold text-balance sm:text-3xl">{title.title} isn&apos;t available on Kids profiles</h1>
      <p className="max-w-md text-white/70">
        {title.rating ? `It's rated ${title.rating}.` : "It doesn't have an age rating yet."} Switch to another profile to watch it.
      </p>
      <Link href="/" className="rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/85">
        Back to Home
      </Link>
    </div>
  );
}
