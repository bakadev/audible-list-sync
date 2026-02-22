'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Pencil, Trash2, ListOrdered, Layers, ExternalLink, Share2 } from 'lucide-react'
import { ShareModal } from './share-modal'

interface ListCardProps {
  list: {
    id: string
    name: string
    description: string | null
    type: 'RECOMMENDATION' | 'TIER'
    itemCount: number
    imageStatus?: string
    updatedAt: string
  }
  username: string | null
  onDelete: (listId: string) => void
}

export function ListCard({ list, username, onDelete }: ListCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      onDelete(list.id)
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const formattedDate = new Date(list.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card className="flex flex-col justify-between p-5">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight line-clamp-2">
            {list.name}
          </h3>
          <Badge
            variant="secondary"
            className="shrink-0 text-xs"
          >
            {list.type === 'RECOMMENDATION' ? (
              <><ListOrdered className="mr-1 h-3 w-3" />List</>
            ) : (
              <><Layers className="mr-1 h-3 w-3" />Tiers</>
            )}
          </Badge>
        </div>

        {list.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {list.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{list.itemCount} {list.itemCount === 1 ? 'title' : 'titles'}</span>
          <span>&middot;</span>
          <span>Updated {formattedDate}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link href={`/lists/${list.id}/edit`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </Link>

        {username && (
          <>
            <Link href={`/${username}/lists/${list.id}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete list</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &ldquo;{list.name}&rdquo;? This will permanently
                remove the list and all its items. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {username && (
        <ShareModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          listName={list.name}
          shareUrl={`/${username}/lists/${list.id}`}
          listId={list.id}
          imageStatus={list.imageStatus || 'NONE'}
        />
      )}
    </Card>
  )
}
