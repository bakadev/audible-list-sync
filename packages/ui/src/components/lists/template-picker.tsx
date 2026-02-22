'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Grid3x3, Star, AlignLeft } from 'lucide-react'

interface Template {
  id: string
  name: string
  description?: string
  slotCount: number
  supportedSizes: string[]
}

interface TemplatePickerProps {
  selectedTemplateId: string | null
  onSelect: (templateId: string) => void
}

const TEMPLATE_ICONS: Record<string, typeof Grid3x3> = {
  'grid-3x3': Grid3x3,
  hero: Star,
  'minimal-banner': AlignLeft,
}

const TEMPLATE_PREVIEW_COLORS: Record<string, { bg: string; accent: string }> = {
  'grid-3x3': { bg: 'bg-slate-900', accent: 'bg-slate-700' },
  hero: { bg: 'bg-indigo-950', accent: 'bg-indigo-800' },
  'minimal-banner': { bg: 'bg-stone-50', accent: 'bg-stone-300' },
}

export function TemplatePicker({
  selectedTemplateId,
  onSelect,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/templates')
        if (res.ok) {
          const data = await res.json()
          setTemplates(data.templates)
        }
      } catch {
        console.error('Failed to fetch templates')
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No templates available.</p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {templates.map((template) => {
        const Icon = TEMPLATE_ICONS[template.id] || Grid3x3
        const colors = TEMPLATE_PREVIEW_COLORS[template.id] || {
          bg: 'bg-slate-900',
          accent: 'bg-slate-700',
        }
        const isSelected = selectedTemplateId === template.id

        return (
          <Card
            key={template.id}
            className={`cursor-pointer overflow-hidden transition-all ${
              isSelected
                ? 'ring-2 ring-primary ring-offset-2'
                : 'hover:border-muted-foreground/50'
            }`}
            onClick={() => onSelect(template.id)}
          >
            {/* Mini preview area */}
            <div
              className={`${colors.bg} flex items-center justify-center p-4`}
              style={{ height: 80 }}
            >
              <TemplatePreviewMini templateId={template.id} accent={colors.accent} />
            </div>

            {/* Info */}
            <div className="space-y-1.5 p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{template.name}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {template.slotCount} covers
                </Badge>
              </div>
              {template.description && (
                <p className="text-xs text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/** Simple mini preview that hints at the template layout. */
function TemplatePreviewMini({
  templateId,
  accent,
}: {
  templateId: string
  accent: string
}) {
  if (templateId === 'grid-3x3') {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={`${accent} h-4 w-6 rounded-sm`} />
        ))}
      </div>
    )
  }

  if (templateId === 'hero') {
    return (
      <div className="flex gap-1.5">
        <div className={`${accent} h-12 w-10 rounded-sm`} />
        <div className="flex flex-col gap-1">
          <div className={`${accent} h-3.5 w-7 rounded-sm`} />
          <div className={`${accent} h-3.5 w-7 rounded-sm`} />
          <div className={`${accent} h-3.5 w-7 rounded-sm`} />
        </div>
      </div>
    )
  }

  if (templateId === 'minimal-banner') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <div className={`${accent} h-2 w-16 rounded-sm`} />
          <div className={`${accent} h-1.5 w-12 rounded-sm`} />
        </div>
        <div className="flex gap-1">
          <div className={`${accent} h-10 w-5 rounded-sm`} />
          <div className={`${accent} h-10 w-5 rounded-sm`} />
          <div className={`${accent} h-10 w-5 rounded-sm`} />
        </div>
      </div>
    )
  }

  return <div className={`${accent} h-8 w-12 rounded-sm`} />
}
