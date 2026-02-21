'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { validateUsername } from '@/lib/username-validation'
import { Loader2 } from 'lucide-react'

interface UsernamePromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function UsernamePrompt({ open, onOpenChange, onSuccess }: UsernamePromptProps) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = username.trim().toLowerCase()
    const validation = validateUsername(trimmed)
    if (!validation.valid) {
      setError(validation.error || 'Invalid username')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/users/me/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(typeof data.error === 'string' ? data.error : 'Failed to set username')
        return
      }

      onSuccess()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set your username</DialogTitle>
          <DialogDescription>
            Choose a username for your public profile. Your lists will be shared at{' '}
            <span className="font-mono text-foreground">/{username || 'username'}/lists</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <Input
                placeholder="e.g., bookworm42"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  setError(null)
                }}
                maxLength={30}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                3-30 characters. Lowercase letters, numbers, and hyphens only.
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !username.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Set Username'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
