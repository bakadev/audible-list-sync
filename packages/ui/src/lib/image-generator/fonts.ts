/**
 * Font loader with module-scope caching.
 *
 * Loads Inter TTF files from disk once and caches them as ArrayBuffers
 * for Satori rendering. Must be TTF/OTF — Satori does NOT support WOFF2.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'

interface FontData {
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}

/** Module-scope cache — fonts loaded once per process lifetime. */
let _fontsCache: FontData[] | null = null

/**
 * Load Inter Regular and Bold font files.
 * Cached after first call — subsequent calls return instantly.
 */
export async function loadFonts(): Promise<FontData[]> {
  if (_fontsCache) {
    return _fontsCache
  }

  const fontsDir = join(process.cwd(), 'fonts')

  const [regularBuffer, boldBuffer] = await Promise.all([
    readFile(join(fontsDir, 'Inter-Regular.ttf')),
    readFile(join(fontsDir, 'Inter-Bold.ttf')),
  ])

  _fontsCache = [
    {
      name: 'Inter',
      data: regularBuffer.buffer as ArrayBuffer,
      weight: 400,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: boldBuffer.buffer as ArrayBuffer,
      weight: 700,
      style: 'normal' as const,
    },
  ]

  return _fontsCache
}
