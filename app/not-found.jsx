import Link from "next/link";
import { Clapperboard } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-4 pt-24 text-center">
      <span className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Clapperboard className="size-10" />
      </span>
      <p className="text-sm font-semibold tracking-[0.3em] text-primary">404</p>
      <h1 className="mt-2 text-3xl font-black md:text-4xl">Lost your way?</h1>
      <p className="mt-3 text-muted-foreground">
        We couldn&apos;t find that page. It may have been removed, or the link is wrong.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg" className="rounded-full px-6">
          <Link href="/">Back to Home</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full px-6">
          <Link href="/search">Search titles</Link>
        </Button>
      </div>
    </main>
  );
}
