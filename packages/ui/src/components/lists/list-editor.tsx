'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import { GripVertical, X } from 'lucide-react'

export interface ListEditorItem {
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

interface ListEditorProps {
  items: ListEditorItem[]
  onItemsChange: (items: ListEditorItem[]) => void
}

function SortableItem({
  item,
  onRemove,
  index,
}: {
  item: ListEditorItem
  onRemove: () => void
  index: number
}) {
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
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-background p-3"
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag to reorder ${item.title.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <span className="w-6 shrink-0 text-center text-sm font-medium text-muted-foreground">
        {index + 1}
      </span>

      {item.title.image ? (
        <img
          src={item.title.image}
          alt=""
          className="h-14 w-10 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="h-14 w-10 shrink-0 rounded bg-muted" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.title.authors.join(', ')}
        </p>
        {item.title.narrators.length > 0 && (
          <p className="truncate text-xs text-muted-foreground">
            Narrated by {item.title.narrators.join(', ')}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label={`Remove ${item.title.title}`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function ListEditor({ items, onItemsChange }: ListEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      position: idx,
    }))
    onItemsChange(reordered)
  }

  const handleRemove = (id: string) => {
    const updated = items
      .filter((i) => i.id !== id)
      .map((item, idx) => ({ ...item, position: idx }))
    onItemsChange(updated)
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No titles added yet. Use the search above to add titles from your library.
        </p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
