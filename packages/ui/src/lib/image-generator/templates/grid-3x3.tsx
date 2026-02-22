/**
 * Grid 3x3 Template — 9 book covers in a 3×3 grid with title and username.
 *
 * Satori-compatible: flexbox only, no hooks, explicit image dimensions.
 */

import React from 'react'
import { SIZE_PRESETS } from '../presets'
import {
  registerTemplate,
  type TemplateProps,
  type SlotSpec,
} from './registry'

function getSlotSpecs(preset: 'og' | 'square'): SlotSpec[] {
  const { width, height } = SIZE_PRESETS[preset]
  // Reserve space for title bar at top
  const titleHeight = preset === 'og' ? 80 : 120
  const gridHeight = height - titleHeight
  const gridWidth = width
  const gap = preset === 'og' ? 4 : 6
  const cols = 3
  const rows = 3
  const slotW = Math.floor((gridWidth - gap * (cols + 1)) / cols)
  const slotH = Math.floor((gridHeight - gap * (rows + 1)) / rows)

  const slots: SlotSpec[] = []
  for (let i = 0; i < 9; i++) {
    slots.push({ id: `slot-${i}`, w: slotW, h: slotH })
  }
  return slots
}

function Grid3x3Template({
  width,
  height,
  title,
  username,
  covers,
}: TemplateProps): React.ReactElement {
  const isOg = width > height
  const titleHeight = isOg ? 80 : 120
  const gap = isOg ? 4 : 6
  const cols = 3
  const gridWidth = width
  const gridHeight = height - titleHeight
  const slotW = Math.floor((gridWidth - gap * (cols + 1)) / cols)
  const slotH = Math.floor((gridHeight - gap * (cols + 1)) / cols)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        backgroundColor: '#0f172a',
        fontFamily: 'Inter',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: titleHeight,
          paddingLeft: gap * 4,
          paddingRight: gap * 4,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span
            style={{
              color: '#f8fafc',
              fontSize: isOg ? 28 : 36,
              fontWeight: 700,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title.length > 40 ? title.substring(0, 40) + '…' : title}
          </span>
          <span
            style={{
              color: '#94a3b8',
              fontSize: isOg ? 14 : 18,
              fontWeight: 400,
            }}
          >
            by {username}
          </span>
        </div>
        <span
          style={{
            color: '#64748b',
            fontSize: isOg ? 12 : 14,
            fontWeight: 400,
          }}
        >
          audioshlf
        </span>
      </div>

      {/* 3×3 grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap,
          paddingLeft: gap,
          paddingRight: gap,
          paddingBottom: gap,
        }}
      >
        {covers.slice(0, 9).map((cover, i) => (
          <img
            key={i}
            src={cover.src}
            width={slotW}
            height={slotH}
            style={{
              objectFit: 'cover',
              borderRadius: 6,
            }}
          />
        ))}
      </div>
    </div>
  )
}

registerTemplate({
  id: 'grid-3x3',
  name: 'Grid',
  description: '3x3 grid of book covers',
  slotCount: 9,
  supportedSizes: ['og', 'square'],
  getSlotSpecs,
  Component: Grid3x3Template,
})

export { Grid3x3Template }
