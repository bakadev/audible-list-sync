'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BookPlus, Search, Loader2, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LookedUpTitle {
  asin: string
  title: string
  subtitle: string | null
  authors: string[]
  narrators: string[]
  image: string | null
  runtimeLengthMin: number | null
}

export function ManualAddTitle() {
  const [asin, setAsin] = useState('')
  const [looking, setLooking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [lookedUp, setLookedUp] = useState<LookedUpTitle | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    const trimmed = asin.trim()
    if (!trimmed) return

    setLooking(true)
    setError(null)
    setLookedUp(null)

    try {
      const res = await fetch(`/api/library/lookup?asin=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Title not found')
        return
      }

      setLookedUp(data)
    } catch {
      setError('Failed to look up title. Please try again.')
    } finally {
      setLooking(false)
    }
  }

  const handleAdd = async () => {
    if (!lookedUp) return

    setAdding(true)

    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: lookedUp.asin }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Failed to add title')
        return
      }

      toast.success(`Added "${lookedUp.title}" to your library`)
      setAsin('')
      setLookedUp(null)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60)
    const remaining = mins % 60
    if (hours === 0) return `${remaining}m`
    if (remaining === 0) return `${hours}h`
    return `${hours}h ${remaining}m`
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookPlus className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Add Title Manually</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Add an audiobook by its Audible ASIN. You can find the ASIN in the
          URL of any Audible product page.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Enter ASIN (e.g. B08G9PRS1K)"
            value={asin}
            onChange={(e) => {
              setAsin(e.target.value)
              setError(null)
              setLookedUp(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookup()
            }}
            className="flex-1"
          />
          <Button
            onClick={handleLookup}
            disabled={!asin.trim() || looking}
            variant="outline"
            className="gap-1.5 shrink-0"
          >
            {looking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Look Up
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {lookedUp && (
          <div className="rounded-lg border p-4">
            <div className="flex gap-4">
              {lookedUp.image ? (
                <img
                  src={lookedUp.image}
                  alt=""
                  className="h-20 w-14 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-20 w-14 shrink-0 rounded bg-muted" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium leading-tight">{lookedUp.title}</p>
                {lookedUp.subtitle && (
                  <p className="text-sm text-muted-foreground">{lookedUp.subtitle}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {lookedUp.authors.join(', ')}
                </p>
                {lookedUp.runtimeLengthMin && (
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(lookedUp.runtimeLengthMin)}
                  </p>
                )}
              </div>
              <Button
                onClick={handleAdd}
                disabled={adding}
                size="sm"
                className="shrink-0 gap-1.5 self-center"
              >
                {adding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {adding ? 'Adding...' : 'Add to Library'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
