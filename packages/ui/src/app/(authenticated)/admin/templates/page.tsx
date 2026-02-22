/**
 * Admin Templates Page
 *
 * Shows all available list image templates with server-rendered PNG previews.
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import Link from 'next/link'
import { getTemplateList } from '@/lib/image-generator/templates/registry'

// Ensure templates are registered
import '@/lib/image-generator/templates/grid-3x3'
import '@/lib/image-generator/templates/hero'
import '@/lib/image-generator/templates/minimal-banner'
import '@/lib/image-generator/templates/hero-plus'

export default async function AdminTemplatesPage() {
  const templates = getTemplateList()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold leading-tight md:text-3xl">
          Templates
        </h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {templates.length} available templates for list image generation
          </p>
          <Link href="/admin/templates/preview">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Live Preview
            </Button>
          </Link>
        </div>
      </div>

      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{template.name}</CardTitle>
              <Badge variant="secondary">
                {template.slotCount} {template.slotCount === 1 ? 'cover' : 'covers'}
              </Badge>
              {template.supportedSizes.map((size) => (
                <Badge key={size} variant="outline">
                  {size.toUpperCase()}
                </Badge>
              ))}
            </div>
            {template.description && (
              <CardDescription>{template.description}</CardDescription>
            )}
            <p className="font-mono text-xs text-muted-foreground">
              ID: {template.id}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {template.supportedSizes.map((size) => (
                <div key={size} className="space-y-2">
                  <p className="text-sm font-medium">
                    {size === 'og' ? 'OG Image (1200×630)' : 'Square (1080×1080)'}
                  </p>
                  <div className="overflow-hidden rounded-lg border bg-muted/30">
                    <img
                      src={`/api/admin/templates/${template.id}/preview?size=${size}`}
                      alt={`${template.name} – ${size} preview`}
                      className="w-full"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
