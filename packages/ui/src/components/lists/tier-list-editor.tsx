'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GripVertical, X, Plus, Pencil, Check, Trash2 } from 'lucide-react'
import type { ListEditorItem } from './list-editor'

const TIER_COLORS: Record<string, string> = {
  'S': 'bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-800',
  'A': 'bg-orange-100 border-orange-300 dark:bg-orange-950 dark:border-orange-800',
  'B': 'bg-yellow-100 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800',
  'C': 'bg-green-100 border-green-300 dark:bg-green-950 dark:border-green-800',
  'D': 'bg-blue-100 border-blue-300 dark:bg-blue-950 dark:border-blue-800',
}

function getTierColor(tier: string): string {
  return TIER_COLORS[tier] || 'bg-muted border-border'
}

interface TierListEditorProps {
  items: ListEditorItem[]
  tiers: string[]
  onItemsChange: (items: ListEditorItem[]) => void
  onTiersChange: (tiers: string[]) => void
}

function TierItem({ item, onRemove }: { item: ListEditorItem; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-background p-2"
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag to reorder ${item.title.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {item.title.image ? (
        <img src={item.title.image} alt="" className="h-10 w-7 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-10 w-7 shrink-0 rounded bg-muted" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.title.authors.join(', ')}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label={`Remove ${item.title.title}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function TierDropZone({ tier, children }: { tier: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: tier })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[48px] space-y-1.5 rounded-md transition-colors ${
        isOver ? 'bg-primary/10 ring-2 ring-primary/30' : ''
      }`}
    >
      {children}
    </div>
  )
}

function DragOverlayItem({ item }: { item: ListEditorItem }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background p-2 shadow-lg">
      {item.title.image ? (
        <img src={item.title.image} alt="" className="h-10 w-7 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-10 w-7 shrink-0 rounded bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title.title}</p>
      </div>
    </div>
  )
}

export function TierListEditor({
  items,
  tiers,
  onItemsChange,
  onTiersChange,
}: TierListEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingTier, setEditingTier] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const getItemsForTier = useCallback(
    (tier: string) =>
      items
        .filter((i) => i.tier === tier)
        .sort((a, b) => a.position - b.position),
    [items]
  )

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null

  const findTierForItem = (itemId: string): string | null => {
    const item = items.find((i) => i.id === itemId)
    return item?.tier || null
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeItemId = active.id as string
    const overId = over.id as string

    const activeTier = findTierForItem(activeItemId)

    // Determine target tier: if hovering over a tier container or an item in a tier
    let overTier: string | null = null
    if (tiers.includes(overId)) {
      overTier = overId
    } else {
      overTier = findTierForItem(overId)
    }

    if (!activeTier || !overTier || activeTier === overTier) return

    // Move item to different tier
    const updatedItems = items.map((item) => {
      if (item.id === activeItemId) {
        return { ...item, tier: overTier }
      }
      return item
    })

    // Recalculate positions within tiers
    const recalculated = recalculatePositions(updatedItems, tiers)
    onItemsChange(recalculated)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeItemId = active.id as string
    const overId = over.id as string

    const activeTier = findTierForItem(activeItemId)
    let overTier = tiers.includes(overId) ? overId : findTierForItem(overId)

    if (!activeTier || !overTier) return

    if (activeTier === overTier) {
      // Reorder within the same tier
      const tierItems = getItemsForTier(activeTier)
      const oldIndex = tierItems.findIndex((i) => i.id === activeItemId)
      const newIndex = tierItems.findIndex((i) => i.id === overId)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(tierItems, oldIndex, newIndex)
        const updatedItems = items.map((item) => {
          if (item.tier === activeTier) {
            const idx = reordered.findIndex((r) => r.id === item.id)
            if (idx !== -1) return { ...item, position: idx }
          }
          return item
        })
        onItemsChange(updatedItems)
      }
    }
  }

  const handleRemove = (id: string) => {
    const updated = items.filter((i) => i.id !== id)
    onItemsChange(recalculatePositions(updated, tiers))
  }

  const handleStartEditTier = (tier: string) => {
    setEditingTier(tier)
    setEditValue(tier)
  }

  const handleSaveEditTier = () => {
    if (!editingTier || !editValue.trim()) return
    const trimmed = editValue.trim().slice(0, 20)
    if (trimmed === editingTier) {
      setEditingTier(null)
      return
    }
    // Rename tier
    const newTiers = tiers.map((t) => (t === editingTier ? trimmed : t))
    const updatedItems = items.map((item) =>
      item.tier === editingTier ? { ...item, tier: trimmed } : item
    )
    onTiersChange(newTiers)
    onItemsChange(updatedItems)
    setEditingTier(null)
  }

  const handleAddTier = () => {
    if (tiers.length >= 10) return
    const newTier = `Tier ${tiers.length + 1}`
    onTiersChange([...tiers, newTier])
  }

  const handleRemoveTier = (tier: string) => {
    if (tiers.length <= 1) return
    const newTiers = tiers.filter((t) => t !== tier)
    // Move orphaned items to first remaining tier
    const updatedItems = items.map((item) =>
      item.tier === tier ? { ...item, tier: newTiers[0] } : item
    )
    onTiersChange(newTiers)
    onItemsChange(recalculatePositions(updatedItems, newTiers))
  }

  if (items.length === 0 && tiers.length > 0) {
    return (
      <div className="space-y-3">
        {tiers.map((tier) => (
          <div key={tier} className={`rounded-lg border p-4 ${getTierColor(tier)}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{tier}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              No titles in this tier. Use the search above to add titles.
            </p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {tiers.map((tier) => {
          const tierItems = getItemsForTier(tier)
          return (
            <div key={tier} className={`rounded-lg border p-3 ${getTierColor(tier)}`}>
              <div className="mb-2 flex items-center justify-between">
                {editingTier === tier ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-7 w-24 text-sm"
                      maxLength={20}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditTier()
                        if (e.key === 'Escape') setEditingTier(null)
                      }}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEditTier}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold">{tier}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleStartEditTier(tier)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{tierItems.length}</span>
                  {tiers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveTier(tier)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <SortableContext
                id={tier}
                items={tierItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <TierDropZone tier={tier}>
                  {tierItems.map((item) => (
                    <TierItem
                      key={item.id}
                      item={item}
                      onRemove={() => handleRemove(item.id)}
                    />
                  ))}
                  {tierItems.length === 0 && (
                    <div className="flex h-12 items-center justify-center rounded-md border border-dashed">
                      <p className="text-xs text-muted-foreground">Drop titles here</p>
                    </div>
                  )}
                </TierDropZone>
              </SortableContext>
            </div>
          )
        })}

        {tiers.length < 10 && (
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={handleAddTier}>
            <Plus className="h-3.5 w-3.5" />
            Add Tier
          </Button>
        )}
      </div>

      <DragOverlay>
        {activeItem ? <DragOverlayItem item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

/** Recalculate positions within each tier */
function recalculatePositions(items: ListEditorItem[], tiers: string[]): ListEditorItem[] {
  const result: ListEditorItem[] = []
  for (const tier of tiers) {
    const tierItems = items
      .filter((i) => i.tier === tier)
      .sort((a, b) => a.position - b.position)
    tierItems.forEach((item, idx) => {
      result.push({ ...item, position: idx })
    })
  }
  // Add any items with unrecognized tiers
  const orphans = items.filter((i) => !tiers.includes(i.tier || ''))
  orphans.forEach((item, idx) => {
    result.push({ ...item, tier: tiers[0], position: result.filter((r) => r.tier === tiers[0]).length })
  })
  return result
}
