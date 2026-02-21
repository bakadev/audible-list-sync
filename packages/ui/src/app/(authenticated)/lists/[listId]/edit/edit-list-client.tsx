'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ListTitlePicker } from '@/components/lists/list-title-picker'
import { ListEditor, type ListEditorItem } from '@/components/lists/list-editor'
import { TierListEditor } from '@/components/lists/tier-list-editor'
import { toast } from 'sonner'
import { Save, Loader2, ArrowLeft, ExternalLink, ListOrdered, Layers } from 'lucide-react'
import Link from 'next/link'

interface EditListClientProps {
  list: {
    id: string
    name: string
    description: string | null
    type: 'RECOMMENDATION' | 'TIER'
    tiers: string[]
    items: ListEditorItem[]
  }
  username: string | null
}

export function EditListClient({ list, username }: EditListClientProps) {
  const router = useRouter()
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description || '')
  const [items, setItems] = useState<ListEditorItem[]>(list.items)
  const [tiers, setTiers] = useState<string[]>(list.tiers)
  const [saving, setSaving] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)

  const existingAsins = useMemo(
    () => new Set(items.map((i) => i.titleAsin)),
    [items]
  )

  const handleAddTitle = (added: {
    titleAsin: string
    title: string
    authors: string[]
    narrators: string[]
    image: string | null
  }) => {
    const newItem: ListEditorItem = {
      id: `new-${added.titleAsin}-${Date.now()}`,
      titleAsin: added.titleAsin,
      position: items.length,
      tier: list.type === 'TIER' ? tiers[0] : null,
      title: {
        asin: added.titleAsin,
        title: added.title,
        authors: added.authors,
        narrators: added.narrators,
        image: added.image,
        runtimeLengthMin: null,
      },
    }
    setItems([...items, newItem])
  }

  const handleSaveItems = async () => {
    setSaving(true)
    try {
      const payload = {
        items: items.map((item) => ({
          titleAsin: item.titleAsin,
          position: item.position,
          ...(list.type === 'TIER' ? { tier: item.tier } : {}),
        })),
      }

      const res = await fetch(`/api/lists/${list.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(typeof data.error === 'string' ? data.error : 'Failed to save items')
        return
      }

      const updated = await res.json()
      // Update items with server-generated IDs
      if (updated.items) {
        setItems(updated.items)
      }
      toast.success('List saved!')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMeta = async () => {
    const trimmedName = name.trim()
    if (!trimmedName || trimmedName.length < 3) {
      toast.error('List name must be at least 3 characters')
      return
    }
    if (trimmedName.length > 80) {
      toast.error('List name must be 80 characters or fewer')
      return
    }

    setSavingMeta(true)
    try {
      const body: Record<string, any> = {
        name: trimmedName,
        description: description.trim() || null,
      }
      if (list.type === 'TIER') {
        body.tiers = tiers
      }

      const res = await fetch(`/api/lists/${list.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(typeof data.error === 'string' ? data.error : 'Failed to update list')
        return
      }

      toast.success('List details updated!')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSavingMeta(false)
    }
  }

  const shareUrl = username ? `/${username}/lists/${list.id}` : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/lists">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Edit List</h1>
              <Badge variant="secondary" className="text-xs">
                {list.type === 'RECOMMENDATION' ? (
                  <><ListOrdered className="mr-1 h-3 w-3" />List</>
                ) : (
                  <><Layers className="mr-1 h-3 w-3" />Tiers</>
                )}
              </Badge>
            </div>
            {shareUrl && (
              <Link
                href={shareUrl}
                className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                target="_blank"
              >
                <ExternalLink className="h-3 w-3" />
                View public page
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* List Metadata */}
      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">List Details</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="edit-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="List name"
            />
            <p className="text-xs text-muted-foreground">{name.trim().length}/80</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Optional description"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">{description.trim().length}/500</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveMeta}
            disabled={savingMeta}
          >
            {savingMeta ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
            ) : (
              'Update Details'
            )}
          </Button>
        </div>
      </div>

      {/* Title Picker */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Add Titles</h2>
        <ListTitlePicker
          existingAsins={existingAsins}
          onAddTitle={handleAddTitle}
          currentItemCount={items.length}
        />
      </div>

      {/* Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {items.length} {items.length === 1 ? 'title' : 'titles'}
          </h2>
          <Button
            onClick={handleSaveItems}
            disabled={saving}
            size="sm"
          >
            {saving ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
            ) : (
              <><Save className="mr-1.5 h-3.5 w-3.5" />Save Order</>
            )}
          </Button>
        </div>

        {list.type === 'RECOMMENDATION' ? (
          <ListEditor items={items} onItemsChange={setItems} />
        ) : (
          <TierListEditor
            items={items}
            tiers={tiers}
            onItemsChange={setItems}
            onTiersChange={setTiers}
          />
        )}
      </div>
    </div>
  )
}
