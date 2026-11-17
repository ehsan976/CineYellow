import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder with the same shape as TitleView, shown while the title streams in. */
export function TitleSkeleton() {
  return (
    <main className="overflow-x-hidden" aria-busy="true" aria-label="Loading title">
      <section className="relative h-[72svh] max-h-[780px] min-h-[540px] w-full bg-card">
        <div className="absolute inset-0 bg-linear-to-t from-background to-transparent" />
        <div className="relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-4 pb-10 md:px-10 md:pb-14">
          <Skeleton className="mb-5 h-4 w-48" />
          <Skeleton className="mb-4 h-6 w-20 rounded-md" />
          <Skeleton className="h-14 w-full max-w-lg md:h-20" />
          <Skeleton className="mt-5 h-4 w-72" />
          <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-3/4 max-w-xl" />
          <div className="mt-7 flex gap-3">
            <Skeleton className="h-11 w-28 rounded-full" />
            <Skeleton className="h-11 w-36 rounded-full" />
            <Skeleton className="h-11 w-24 rounded-full" />
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 pt-6 md:px-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <Skeleton className="mb-4 h-8 w-40" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="hidden aspect-2/3 w-full rounded-xl lg:block" />
      </div>
    </main>
  );
}
