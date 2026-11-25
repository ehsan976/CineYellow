import type { Title } from "@/lib/types";
import Link from "next/link";

/**
 * Shown by the watch page (server side) instead of the player when the viewer has no paid time.
 * The video link isn't read for them at all (lib/server/dal.ts getWatchAccess).
 */
export function PlanRequired({ title, pendingPayment }: { title: Title; pendingPayment: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
      <h1 className="text-2xl font-bold sm:text-3xl">Choose a plan to watch {title.title}</h1>
      <p className="max-w-md text-white/70">
        {pendingPayment
          ? "Your payment is still being confirmed. Check its status on the Account page."
          : "Pay for a month with Safepay — Basic, Standard or Premium."}
      </p>
      <div className="flex gap-3">
        <Link href="/account" className="rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/85">
          See plans
        </Link>
        <Link href={`/title/${title.id}`} className="rounded-md bg-white/15 px-5 py-2.5 font-semibold hover:bg-white/25">
          Back
        </Link>
      </div>
    </div>
  );
}
