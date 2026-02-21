'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateUsername } from '@/lib/username-validation'
import { toast } from 'sonner'
import { Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface UsernameFormProps {
  currentUsername: string | null
}

export function UsernameForm({ currentUsername }: UsernameFormProps) {
  const [username, setUsername] = useState(currentUsername || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedUsername, setSavedUsername] = useState(currentUsername)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = username.trim().toLowerCase()
    const validation = validateUsername(trimmed)
    if (!validation.valid) {
      setError(validation.error || 'Invalid username')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/users/me/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(typeof data.error === 'string' ? data.error : 'Failed to update username')
        return
      }

      setSavedUsername(trimmed)
      toast.success('Username updated!')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Public Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your username is used for your public profile URL where others can view your lists.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <Input
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              setError(null)
            }}
            placeholder="e.g., bookworm42"
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground">
            3-30 characters. Lowercase letters, numbers, and hyphens only.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {savedUsername && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Your public profile:</span>
            <Link
              href={`/${savedUsername}`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              target="_blank"
            >
              /{savedUsername}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}

        <Button type="submit" disabled={saving || !username.trim()}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : savedUsername ? (
            'Update Username'
          ) : (
            'Set Username'
          )}
        </Button>
      </form>
    </div>
  )
}
