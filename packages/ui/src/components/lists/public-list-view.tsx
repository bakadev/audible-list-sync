interface PublicListItem {
  id: string
  titleAsin: string
  position: number
  title: {
    asin: string
    title: string
    authors: string[]
    narrators: string[]
    image: string | null
    runtimeLengthMin: number | null
  }
}

interface PublicListViewProps {
  items: PublicListItem[]
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function PublicListView({ items }: PublicListViewProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">This list is empty.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex items-center gap-4 rounded-lg border bg-background p-4"
        >
          <span className="w-8 shrink-0 text-center text-lg font-bold text-muted-foreground">
            {index + 1}
          </span>

          {item.title.image ? (
            <img
              src={item.title.image}
              alt=""
              className="h-16 w-12 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="h-16 w-12 shrink-0 rounded bg-muted" />
          )}

          <div className="min-w-0 flex-1">
            <p className="font-medium leading-tight">{item.title.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {item.title.authors.join(', ')}
            </p>
            {item.title.narrators.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Narrated by {item.title.narrators.join(', ')}
              </p>
            )}
          </div>

          {item.title.runtimeLengthMin && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRuntime(item.title.runtimeLengthMin)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
