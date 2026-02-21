'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ListOrdered, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { UsernamePrompt } from '@/components/lists/username-prompt'

interface CreateListFormProps {
  hasUsername: boolean
}

export function CreateListForm({ hasUsername }: CreateListFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'RECOMMENDATION' | 'TIER'>('RECOMMENDATION')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false)
  const [usernameSet, setUsernameSet] = useState(hasUsername)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    const trimmedName = name.trim()
    if (!trimmedName) {
      newErrors.name = 'List name is required'
    } else if (trimmedName.length < 3) {
      newErrors.name = 'List name must be at least 3 characters'
    } else if (trimmedName.length > 80) {
      newErrors.name = 'List name must be 80 characters or fewer'
    }

    if (description.trim().length > 500) {
      newErrors.description = 'Description must be 500 characters or fewer'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!usernameSet) {
      setShowUsernamePrompt(true)
      return
    }

    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          type,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(typeof data.error === 'string' ? data.error : 'Failed to create list')
        return
      }

      const list = await res.json()
      toast.success('List created!')
      router.push(`/lists/${list.id}/edit`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            List Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Best LitRPG of 2025"
            maxLength={80}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          <p className="text-xs text-muted-foreground">{name.trim().length}/80 characters</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for your list"
            maxLength={500}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          <p className="text-xs text-muted-foreground">{description.trim().length}/500 characters</p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">List Type</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              className={`cursor-pointer p-4 transition-colors ${
                type === 'RECOMMENDATION'
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => setType('RECOMMENDATION')}
            >
              <div className="flex items-start gap-3">
                <ListOrdered className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Recommendation List</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ordered list of your top picks. Drag to rank.
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className={`cursor-pointer p-4 transition-colors ${
                type === 'TIER'
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => setType('TIER')}
            >
              <div className="flex items-start gap-3">
                <Layers className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Tier List</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Organize titles into tiers like S, A, B, C, D.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating...' : 'Create List'}
        </Button>
      </form>

      <UsernamePrompt
        open={showUsernamePrompt}
        onOpenChange={setShowUsernamePrompt}
        onSuccess={() => {
          setUsernameSet(true)
          setShowUsernamePrompt(false)
          toast.success('Username set! You can now create lists.')
        }}
      />
    </>
  )
}
