'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Copy,
  Check,
  Download,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { generateShareUrl, type SharePlatform } from '@/lib/share'

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listName: string
  shareUrl: string
  listId: string
  imageStatus: string
}

const SOCIAL_PLATFORMS: { id: SharePlatform; label: string; color: string }[] = [
  { id: 'x', label: 'X (Twitter)', color: 'bg-black hover:bg-gray-800 text-white' },
  { id: 'facebook', label: 'Facebook', color: 'bg-[#1877F2] hover:bg-[#166FE5] text-white' },
  { id: 'reddit', label: 'Reddit', color: 'bg-[#FF4500] hover:bg-[#E03D00] text-white' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-[#0A66C2] hover:bg-[#095BA8] text-white' },
]

export function ShareModal({
  open,
  onOpenChange,
  listName,
  shareUrl,
  listId,
  imageStatus,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const fullShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${shareUrl}`
    : shareUrl

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleSocialShare = (platform: SharePlatform) => {
    const url = generateShareUrl(platform, fullShareUrl, listName)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const hasImages = imageStatus === 'READY'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share List</DialogTitle>
          <DialogDescription>
            Share &ldquo;{listName}&rdquo; with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copy Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link</label>
            <div className="flex gap-2">
              <div className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {fullShareUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Download Images */}
          {hasImages && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Download Image</label>
              <div className="flex gap-2">
                <a
                  href={`/api/lists/${listId}/og-image`}
                  download={`${listName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-og.png`}
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    OG (1200×630)
                  </Button>
                </a>
                <a
                  href={`/api/lists/${listId}/square-image`}
                  download={`${listName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-square.png`}
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Square (1080×1080)
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Social Share */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share to</label>
            <div className="grid grid-cols-2 gap-2">
              {SOCIAL_PLATFORMS.map((platform) => (
                <Button
                  key={platform.id}
                  variant="outline"
                  size="sm"
                  className={`gap-1.5 ${platform.color}`}
                  onClick={() => handleSocialShare(platform.id)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {platform.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
