export default function EditListLoading() {
  return (
    <div className="container max-w-4xl py-8 md:py-12">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded bg-muted" />
          <div className="space-y-1.5">
            <div className="h-7 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Metadata section skeleton */}
        <div className="space-y-4 rounded-lg border p-4">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
            <div className="h-16 w-full animate-pulse rounded bg-muted" />
            <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Title picker skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>

        {/* Editor skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="h-5 w-5 animate-pulse rounded bg-muted" />
                <div className="h-14 w-10 animate-pulse rounded bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
