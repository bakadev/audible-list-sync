/**
 * Orchestrator — coordinates template selection, cover fetching,
 * rendering for both OG and Square sizes, returns PNG buffers.
 */

import React from 'react'
import { getTemplate } from './templates/registry'
import { SIZE_PRESETS, DEFAULT_REQUIRED_SIZES } from './presets'
import { fetchCovers } from './covers'
import { renderToPng, type RenderResult } from './render'

// Ensure all templates are registered
import './templates/grid-3x3'
import './templates/hero'
import './templates/minimal-banner'
import './templates/hero-plus'
import './templates/tier-list'

export interface ListImageInput {
  listId: string
  title: string
  description?: string
  username: string
  books: Array<{
    coverImageUrl: string | null
    asin: string
    title?: string
    tier?: string | null
  }>
  templateId: string
  sizes?: string[]
  /** For tier lists: ordered tier labels (e.g., ['S', 'A', 'B', 'C']) */
  tierLabels?: string[]
}

export interface GeneratedImages {
  [size: string]: RenderResult
}

/**
 * Generate list images for all requested sizes.
 *
 * @param input  List data, template ID, and optional size overrides
 * @returns Map of size → RenderResult (PNG buffer + metadata)
 * @throws Error if template ID is invalid
 */
export async function generateListImages(
  input: ListImageInput
): Promise<GeneratedImages> {
  const template = getTemplate(input.templateId)
  if (!template) {
    throw new Error(`Unknown template: ${input.templateId}`)
  }

  const sizes = input.sizes ?? [...DEFAULT_REQUIRED_SIZES]
  const results: GeneratedImages = {}

  for (const size of sizes) {
    const preset = SIZE_PRESETS[size]
    if (!preset) {
      console.warn(`Unknown size preset: ${size}, skipping`)
      continue
    }

    // Get slot specs for this size
    const slotSpecs = template.getSlotSpecs(size as 'og' | 'square')

    // Select covers — for tier lists, order by tier; otherwise take first N
    let orderedBooks = input.books
    if (input.tierLabels && input.tierLabels.length > 0) {
      // Order books by tier label order, then take first N for each tier
      orderedBooks = input.tierLabels.flatMap((label) =>
        input.books.filter((b) => b.tier === label)
      )
    }
    const coverUrls = orderedBooks
      .slice(0, template.slotCount)
      .map((book) => book.coverImageUrl)

    // Fetch and encode covers (with placeholders for missing/failed)
    const covers = await fetchCovers(coverUrls, slotSpecs)

    // Build tier data if this is a tier list
    let tiers: { label: string; coverCount: number }[] | undefined
    if (input.tierLabels && input.tierLabels.length > 0) {
      tiers = input.tierLabels.map((label) => ({
        label,
        coverCount: input.books.filter((b) => b.tier === label).length,
      }))
    }

    // Build template props
    const templateProps = {
      width: preset.width,
      height: preset.height,
      title: input.title,
      description: input.description,
      username: input.username,
      covers,
      tiers,
    }

    // Render template to PNG
    const element = React.createElement(template.Component, templateProps)
    const result = await renderToPng(element, preset.width, preset.height)

    results[size] = result
  }

  return results
}
