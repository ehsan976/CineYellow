import { gridClass } from "@/lib/ui";
import { Skeleton } from "@/components/ui/skeleton";

export function GridSkeleton({ count = 12 }) {
  return (
    <div className={gridClass} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-2/3 w-full rounded-md" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <Skeleton className="mt-1.5 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
