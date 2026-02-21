interface PublicTierItem {
  id: string
  titleAsin: string
  position: number
  tier: string | null
  title: {
    asin: string
    title: string
    authors: string[]
    narrators: string[]
    image: string | null
    runtimeLengthMin: number | null
  }
}

interface PublicTierViewProps {
  items: PublicTierItem[]
  tiers: string[]
}

const TIER_DISPLAY_COLORS: Record<string, string> = {
  'S': 'bg-red-100 border-red-200 dark:bg-red-950 dark:border-red-900',
  'A': 'bg-orange-100 border-orange-200 dark:bg-orange-950 dark:border-orange-900',
  'B': 'bg-yellow-100 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-900',
  'C': 'bg-green-100 border-green-200 dark:bg-green-950 dark:border-green-900',
  'D': 'bg-blue-100 border-blue-200 dark:bg-blue-950 dark:border-blue-900',
}

const TIER_LABEL_COLORS: Record<string, string> = {
  'S': 'bg-red-500 text-white',
  'A': 'bg-orange-500 text-white',
  'B': 'bg-yellow-500 text-white',
  'C': 'bg-green-500 text-white',
  'D': 'bg-blue-500 text-white',
}

function getTierBgColor(tier: string): string {
  return TIER_DISPLAY_COLORS[tier] || 'bg-muted border-border'
}

function getTierLabelColor(tier: string): string {
  return TIER_LABEL_COLORS[tier] || 'bg-muted-foreground text-white'
}

export function PublicTierView({ items, tiers }: PublicTierViewProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">This tier list is empty.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tiers.map((tier) => {
        const tierItems = items
          .filter((i) => i.tier === tier)
          .sort((a, b) => a.position - b.position)

        return (
          <div
            key={tier}
            className={`rounded-lg border p-3 ${getTierBgColor(tier)}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold ${getTierLabelColor(tier)}`}
              >
                {tier}
              </span>
              <span className="text-xs text-muted-foreground">
                {tierItems.length} {tierItems.length === 1 ? 'title' : 'titles'}
              </span>
            </div>

            {tierItems.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No titles in this tier
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tierItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-md border bg-background p-2"
                  >
                    {item.title.image ? (
                      <img
                        src={item.title.image}
                        alt=""
                        className="h-12 w-9 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-9 shrink-0 rounded bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.title.authors.join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
