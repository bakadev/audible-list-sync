'use client'

import { useState, useCallback } from 'react'
import { Loader2, ImageOff } from 'lucide-react'

interface ListImageHeaderProps {
  imageUrl: string | null
  imageStatus: string
  listName: string
}

export function ListImageHeader({
  imageUrl,
  imageStatus,
  listName,
}: ListImageHeaderProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Use callback ref to handle images that loaded before React attaches onLoad
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0) {
      setLoading(false)
    }
  }, [])

  // No image to show
  if (imageStatus === 'NONE' || !imageUrl) {
    return null
  }

  // Still generating
  if (imageStatus === 'GENERATING') {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating image...
        </div>
      </div>
    )
  }

  // Generation failed
  if (imageStatus === 'FAILED') {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageOff className="h-4 w-4" />
          Image generation failed
        </div>
      </div>
    )
  }

  // Image ready — show it
  return (
    <div className="overflow-hidden rounded-lg">
      {error ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageOff className="h-4 w-4" />
            Failed to load image
          </div>
        </div>
      ) : (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            ref={imgRef}
            src={imageUrl}
            alt={`Generated image for ${listName}`}
            className="w-full rounded-lg"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setError(true)
            }}
          />
        </div>
      )}
    </div>
  )
}
