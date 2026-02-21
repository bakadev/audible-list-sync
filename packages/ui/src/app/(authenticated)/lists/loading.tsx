import { Card } from '@/components/ui/card'

function ListCardSkeleton() {
  return (
    <Card className="flex flex-col justify-between p-5">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-5 w-14 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-3">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-8 flex-1 animate-pulse rounded bg-muted" />
        <div className="h-8 w-10 animate-pulse rounded bg-muted" />
      </div>
    </Card>
  )
}

export default function ListsLoading() {
  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ListCardSkeleton />
          <ListCardSkeleton />
          <ListCardSkeleton />
        </div>
      </div>
    </div>
  )
}
