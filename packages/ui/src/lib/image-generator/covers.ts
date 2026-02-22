/**
 * Cover fetching pipeline — fetch remote images, convert to base64 data URLs,
 * and generate placeholders for missing covers.
 *
 * Covers must be pre-fetched and base64-encoded because Satori's built-in
 * remote image loading is unreliable.
 */

import type { CoverAsset, SlotSpec } from './templates/registry'

/** Max concurrent cover fetches to avoid rate limiting. */
const FETCH_CONCURRENCY = 6

/** Timeout per cover fetch in ms. */
const FETCH_TIMEOUT_MS = 8000

/**
 * Generate a neutral placeholder SVG as a data URL.
 * Shows the app name with a subtle book icon.
 */
function generatePlaceholder(slotW: number, slotH: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${slotW}" height="${slotH}" viewBox="0 0 ${slotW} ${slotH}">
    <rect width="${slotW}" height="${slotH}" fill="#334155" rx="4"/>
    <text x="${slotW / 2}" y="${slotH / 2 - 8}" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="14">📚</text>
    <text x="${slotW / 2}" y="${slotH / 2 + 14}" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="11">audioshlf</text>
  </svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/**
 * Fetch a single cover image and convert to base64 data URL.
 * Returns null on failure — caller should use placeholder.
 */
async function fetchCoverAsDataUrl(
  url: string
): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'audioshlf-image-generator/1.0',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.warn(`Cover fetch failed (${response.status}): ${url}`)
      return null
    }

    const buffer = await response.arrayBuffer()
    const contentType =
      response.headers.get('content-type') || 'image/jpeg'
    const base64 = Buffer.from(buffer).toString('base64')

    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.warn(`Cover fetch error for ${url}:`, error)
    return null
  }
}

/**
 * Fetch covers for all slots with concurrency limiting.
 *
 * @param coverUrls  Ordered array of cover image URLs (may have nulls for missing covers)
 * @param slotSpecs  Slot specifications from the template (for placeholder sizing)
 * @returns Array of CoverAsset objects (same length as slotSpecs)
 */
/**
 * Generate an array of placeholder CoverAssets for all slots.
 * Used for template previews without real book data.
 */
export function generatePlaceholderCovers(slotSpecs: SlotSpec[]): CoverAsset[] {
  return slotSpecs.map((spec) => ({
    src: generatePlaceholder(spec.w, spec.h),
    isPlaceholder: true,
  }))
}

export async function fetchCovers(
  coverUrls: (string | null | undefined)[],
  slotSpecs: SlotSpec[]
): Promise<CoverAsset[]> {
  const results: CoverAsset[] = new Array(slotSpecs.length)

  // Prepare work items — only fetch for slots that have a cover URL
  interface WorkItem {
    index: number
    url: string
  }
  const workItems: WorkItem[] = []

  for (let i = 0; i < slotSpecs.length; i++) {
    const url = i < coverUrls.length ? coverUrls[i] : null
    if (url) {
      workItems.push({ index: i, url })
    } else {
      // No URL — use placeholder immediately
      results[i] = {
        src: generatePlaceholder(slotSpecs[i].w, slotSpecs[i].h),
        isPlaceholder: true,
      }
    }
  }

  // Fetch in batches with concurrency limit
  for (let i = 0; i < workItems.length; i += FETCH_CONCURRENCY) {
    const batch = workItems.slice(i, i + FETCH_CONCURRENCY)
    const batchResults = await Promise.allSettled(
      batch.map((item) => fetchCoverAsDataUrl(item.url))
    )

    batch.forEach((item, batchIndex) => {
      const result = batchResults[batchIndex]
      if (result.status === 'fulfilled' && result.value) {
        results[item.index] = {
          src: result.value,
          isPlaceholder: false,
        }
      } else {
        // Fetch failed — use placeholder
        const spec = slotSpecs[item.index]
        results[item.index] = {
          src: generatePlaceholder(spec.w, spec.h),
          isPlaceholder: true,
        }
      }
    })
  }

  return results
}
