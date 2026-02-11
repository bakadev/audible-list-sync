import { Card } from "@/components/ui/card";

export function LibrarySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="flex gap-4 p-4">
            {/* Cover skeleton */}
            <div className="h-32 w-24 shrink-0 animate-pulse rounded bg-muted" />

            {/* Content skeleton */}
            <div className="flex flex-1 flex-col gap-3">
              <div className="space-y-2">
                {/* Title */}
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                {/* Subtitle */}
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              </div>

              {/* Authors */}
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />

              {/* Narrators */}
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />

              {/* Duration and rating */}
              <div className="mt-auto flex gap-4">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
