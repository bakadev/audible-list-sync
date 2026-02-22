'use client'

/**
 * Live Template Preview — renders templates directly in the browser for
 * instant feedback during development. No server round-trip needed.
 *
 * Templates are pure React components with inline styles + flexbox,
 * so they render identically in the browser and Satori.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SIZE_PRESETS } from '@/lib/image-generator/presets'
import { getAllTemplates } from '@/lib/image-generator/templates/registry'
import type { CoverAsset, SlotSpec } from '@/lib/image-generator/templates/registry'

// Ensure templates are registered
import '@/lib/image-generator/templates/grid-3x3'
import '@/lib/image-generator/templates/hero'
import '@/lib/image-generator/templates/minimal-banner'
import '@/lib/image-generator/templates/hero-plus'

/**
 * Browser-safe placeholder cover generator.
 * Same visual as the server-side generatePlaceholder but uses btoa() instead of Buffer.
 */
function generatePlaceholderBrowser(w: number, h: number): string {
  const cx = w / 2
  const cy = h / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#334155" rx="4"/>
    <rect x="${cx - 10}" y="${cy - 18}" width="20" height="24" rx="2" fill="none" stroke="#64748b" stroke-width="1.5"/>
    <line x1="${cx}" y1="${cy - 16}" x2="${cx}" y2="${cy + 4}" stroke="#64748b" stroke-width="1"/>
    <text x="${cx}" y="${cy + 22}" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="11">audioshlf</text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

function makePlaceholderCovers(slotSpecs: SlotSpec[]): CoverAsset[] {
  return slotSpecs.map((spec) => ({
    src: generatePlaceholderBrowser(spec.w, spec.h),
    isPlaceholder: true,
  }))
}

export default function TemplatePreviewPage() {
  const templates = useMemo(() => getAllTemplates(), [])
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? '')
  const [size, setSize] = useState<'og' | 'square'>('og')
  const [title, setTitle] = useState('My Favorite Audiobooks')
  const [username, setUsername] = useState('sampleuser')
  const [description, setDescription] = useState('A curated collection of great listens')
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId),
    [templates, selectedId]
  )

  const preset = SIZE_PRESETS[size]

  // Calculate scale factor to fit preview in container
  useEffect(() => {
    if (!containerRef.current) return

    const updateScale = () => {
      const containerWidth = containerRef.current?.clientWidth ?? preset.width
      setScale(Math.min(1, containerWidth / preset.width))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [preset.width])

  // Build props for the template
  const covers = useMemo(() => {
    if (!selectedTemplate) return []
    const slotSpecs = selectedTemplate.getSlotSpecs(size)
    return makePlaceholderCovers(slotSpecs)
  }, [selectedTemplate, size])

  const templateProps = {
    width: preset.width,
    height: preset.height,
    title,
    description,
    username,
    covers,
  }

  return (
    <div className="space-y-6">
      {/* Load Inter font for browser rendering */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="space-y-1">
        <h2 className="text-2xl font-bold leading-tight md:text-3xl">
          Template Preview
        </h2>
        <p className="text-sm text-muted-foreground">
          Live browser preview — edits update instantly
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Template selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <Button
                  key={t.id}
                  variant={selectedId === t.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedId(t.id)}
                  className="gap-1.5"
                >
                  {t.name}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {t.slotCount}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Size toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Size</label>
            <div className="flex gap-2">
              <Button
                variant={size === 'og' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSize('og')}
              >
                OG (1200×630)
              </Button>
              <Button
                variant={size === 'square' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSize('square')}
              >
                Square (1080×1080)
              </Button>
            </div>
          </div>

          {/* Editable data */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="List title"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Preview</h3>
          <span className="text-xs text-muted-foreground">
            {preset.width}×{preset.height} @ {Math.round(scale * 100)}%
          </span>
        </div>
        <div
          ref={containerRef}
          className="overflow-hidden rounded-lg border bg-muted/30"
          style={{
            height: preset.height * scale,
          }}
        >
          {selectedTemplate && (
            <div
              style={{
                width: preset.width,
                height: preset.height,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <selectedTemplate.Component {...templateProps} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
