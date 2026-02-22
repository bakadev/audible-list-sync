/**
 * Render pipeline — Satori (JSX → SVG) + Resvg (SVG → PNG).
 *
 * Takes a React element and font data, returns a PNG buffer.
 */

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { loadFonts } from './fonts'
import type { ReactElement } from 'react'

export interface RenderResult {
  buffer: Buffer
  width: number
  height: number
  contentType: 'image/png'
}

/**
 * Render a React element to a PNG buffer using Satori + Resvg.
 *
 * @param element  Satori-compatible React element (flexbox only, no hooks)
 * @param width    Output image width in pixels
 * @param height   Output image height in pixels
 * @returns PNG buffer with metadata
 */
export async function renderToPng(
  element: ReactElement,
  width: number,
  height: number
): Promise<RenderResult> {
  const fonts = await loadFonts()

  // Satori: JSX → SVG string
  const svg = await satori(element, {
    width,
    height,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
      style: f.style,
    })),
  })

  // Resvg: SVG → PNG buffer
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width' as const,
      value: width,
    },
  })

  const rendered = resvg.render()
  const pngBuffer = rendered.asPng()

  return {
    buffer: Buffer.from(pngBuffer),
    width,
    height,
    contentType: 'image/png',
  }
}
