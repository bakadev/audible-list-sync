'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Check, Loader2, AlertCircle } from 'lucide-react'

interface LibraryTitle {
  id: string
  title: {
    asin: string
    title: string
    authors: string[]
    narrators: string[]
    image: string | null
  }
}

interface ListTitlePickerProps {
  /** ASINs already in the list (to show "already added" state) */
  existingAsins: Set<string>
  /** Called when user adds a title */
  onAddTitle: (item: { titleAsin: string; title: string; authors: string[]; narrators: string[]; image: string | null }) => void
  /** Max items allowed (default 100) */
  maxItems?: number
  /** Current item count */
  currentItemCount: number
}

export function ListTitlePicker({
  existingAsins,
  onAddTitle,
  maxItems = 100,
  currentItemCount,
}: ListTitlePickerProps) {
  const [search, setSearch] = useState('')
  const [library, setLibrary] = useState<LibraryTitle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load entire library on mount (single request)
  useEffect(() => {
    let cancelled = false

    async function loadLibrary() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/library?limit=500')
        if (!res.ok) throw new Error('Failed to load library')
        const data = await res.json()
        if (!cancelled) {
          setLibrary(data.items || [])
        }
      } catch (err) {
        console.error('Library load error:', err)
        if (!cancelled) {
          setError('Failed to load your library. Please refresh the page.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadLibrary()
    return () => { cancelled = true }
  }, [])

  // Client-side filtering — instant, searches across title, authors, narrators
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []

    return library.filter((item) => {
      if (item.title.title.toLowerCase().includes(query)) return true
      if (item.title.authors.some((a) => a.toLowerCase().includes(query))) return true
      if (item.title.narrators.some((n) => n.toLowerCase().includes(query))) return true
      return false
    }).slice(0, 20)
  }, [search, library])

  const atCapacity = currentItemCount >= maxItems

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={loading ? 'Loading your library...' : `Search ${library.length} titles in your library...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          disabled={loading}
        />
      </div>

      {atCapacity && (
        <p className="text-sm text-destructive">
          Maximum of {maxItems} titles reached. Remove items to add more.
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading your library...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-6 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && search.trim() && filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No titles found matching &ldquo;{search}&rdquo;
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-2">
          {filtered.map((item) => {
            const isAdded = existingAsins.has(item.title.asin)

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
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

                <Button
                  variant={isAdded ? 'ghost' : 'outline'}
                  size="sm"
                  disabled={isAdded || atCapacity}
                  onClick={() => {
                    if (!isAdded && !atCapacity) {
                      onAddTitle({
                        titleAsin: item.title.asin,
                        title: item.title.title,
                        authors: item.title.authors,
                        narrators: item.title.narrators,
                        image: item.title.image,
                      })
                    }
                  }}
                  className="shrink-0"
                >
                  {isAdded ? (
                    <><Check className="mr-1 h-3.5 w-3.5" />Added</>
                  ) : (
                    <><Plus className="mr-1 h-3.5 w-3.5" />Add</>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
