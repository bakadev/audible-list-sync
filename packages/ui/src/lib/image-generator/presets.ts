/**
 * Size preset constants for image generation.
 *
 * OG (Open Graph): 1200×630 — used for link previews on social platforms.
 * Square: 1080×1080 — used for Instagram/general posting.
 */

export interface SizePreset {
  width: number
  height: number
}

export const SIZE_PRESETS: Record<string, SizePreset> = {
  og: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
} as const

export const DEFAULT_REQUIRED_SIZES = ['og', 'square'] as const

export type PresetName = keyof typeof SIZE_PRESETS
