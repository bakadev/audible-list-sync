'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2 } from 'lucide-react'
import { ShareModal } from './share-modal'

interface ShareButtonProps {
  listName: string
  shareUrl: string
  listId: string
  imageStatus: string
}

export function ShareButton({
  listName,
  shareUrl,
  listId,
  imageStatus,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </Button>

      <ShareModal
        open={open}
        onOpenChange={setOpen}
        listName={listName}
        shareUrl={shareUrl}
        listId={listId}
        imageStatus={imageStatus}
      />
    </>
  )
}
