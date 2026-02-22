/**
 * GET /api/admin/templates/[templateId]/preview
 *
 * Generates a PNG preview of a template using placeholder covers.
 * Admin-only. Accepts ?size=og|square (default: og).
 */

import { NextRequest } from 'next/server'
import React from 'react'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'
import { getTemplate } from '@/lib/image-generator/templates/registry'
import { SIZE_PRESETS } from '@/lib/image-generator/presets'
import { renderToPng } from '@/lib/image-generator/render'
import { generatePlaceholderCovers } from '@/lib/image-generator/covers'

// Ensure templates are registered
import '@/lib/image-generator/templates/grid-3x3'
import '@/lib/image-generator/templates/hero'
import '@/lib/image-generator/templates/minimal-banner'
import '@/lib/image-generator/templates/hero-plus'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  requireAdmin(user)

  const { templateId } = await params
  const size = request.nextUrl.searchParams.get('size') || 'og'

  const template = getTemplate(templateId)
  if (!template) {
    return Response.json({ error: 'Template not found' }, { status: 404 })
  }

  const preset = SIZE_PRESETS[size]
  if (!preset) {
    return Response.json({ error: 'Invalid size. Use "og" or "square"' }, { status: 400 })
  }

  const slotSpecs = template.getSlotSpecs(size as 'og' | 'square')
  const covers = generatePlaceholderCovers(slotSpecs)

  const element = React.createElement(template.Component, {
    width: preset.width,
    height: preset.height,
    title: 'My Favorite Audiobooks',
    description: 'A curated collection of great listens',
    username: 'sampleuser',
    covers,
  })

  const result = await renderToPng(element, preset.width, preset.height)

  return new Response(result.buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
