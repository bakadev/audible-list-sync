/**
 * Hero Template — 1 large cover + 3 smaller covers in a strip, with title/username.
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
  const isOg = preset === 'og'
  const padding = isOg ? 24 : 32

  if (isOg) {
    // OG: hero cover on left (tall), 3 smaller on the right stacked vertically
    // Title block: font 26*1.2 + marginTop 4 + font 14*1.2 ≈ 52 (parent gap handles spacing)
    const ogTitleHeight = 52
    const heroW = Math.floor((width - padding * 3) * 0.45)
    const heroH = height - padding * 2
    const smallW = Math.floor((width - padding * 3) - heroW)
    const gap = 8
    const smallH = Math.floor((heroH - ogTitleHeight - gap * 3) / 3)

    return [
      { id: 'hero', w: heroW, h: heroH },
      { id: 'small-0', w: smallW, h: smallH },
      { id: 'small-1', w: smallW, h: smallH },
      { id: 'small-2', w: smallW, h: smallH },
    ]
  }

  // Square: hero cover on top (large), 3 smaller below in a row
  const titleHeight = 100
  const gap = 8
  const heroH = Math.floor((height - titleHeight - padding * 2 - gap) * 0.65)
  const heroW = width - padding * 2
  const smallH = Math.floor((height - titleHeight - padding * 2 - gap) * 0.35)
  const smallW = Math.floor((heroW - gap * 2) / 3)

  return [
    { id: 'hero', w: heroW, h: heroH },
    { id: 'small-0', w: smallW, h: smallH },
    { id: 'small-1', w: smallW, h: smallH },
    { id: 'small-2', w: smallW, h: smallH },
  ]
}

function HeroTemplate({
  width,
  height,
  title,
  username,
  covers,
}: TemplateProps): React.ReactElement {
  const isOg = width > height
  const padding = isOg ? 24 : 32
  const gap = 8

  if (isOg) {
    // OG layout: hero on left, 3 small stacked on right, title + author block above covers
    // Title block: font 26*1.2 + marginTop 4 + font 14*1.2 ≈ 52 (parent gap handles spacing)
    const ogTitleHeight = 52
    const heroW = Math.floor((width - padding * 3) * 0.45)
    const contentH = height - padding * 2
    const smallW = Math.floor((width - padding * 3) - heroW)
    const smallH = Math.floor((contentH - ogTitleHeight - gap * 3) / 3)

    return (
      <div
        style={{
          display: 'flex',
          width,
          height,
          backgroundColor: '#1e1b4b',
          fontFamily: 'Inter',
          padding,
          gap: padding,
        }}
      >
        {/* Hero cover */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <img
            src={covers[0]?.src}
            width={heroW}
            height={contentH}
            style={{ objectFit: 'cover', borderRadius: 12 }}
          />
        </div>

        {/* Right side: title + 3 small covers */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                color: '#e0e7ff',
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title.length > 35 ? title.substring(0, 35) + '…' : title}
            </span>
            <span style={{ color: '#a5b4fc', fontSize: 14, fontWeight: 400, marginTop: 4 }}>
              by {username} · audioshlf
            </span>
          </div>

          {covers.slice(1, 4).map((cover, i) => (
            <img
              key={i}
              src={cover.src}
              width={smallW}
              height={smallH}
              style={{ objectFit: 'cover', borderRadius: 8 }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Square layout: title, hero on top, 3 small below
  const titleHeight = 100
  const heroH = Math.floor((height - titleHeight - padding * 2 - gap) * 0.65)
  const heroW = width - padding * 2
  const smallH = Math.floor((height - titleHeight - padding * 2 - gap) * 0.35)
  const smallW = Math.floor((heroW - gap * 2) / 3)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        backgroundColor: '#1e1b4b',
        fontFamily: 'Inter',
        padding,
        gap,
      }}
    >
      {/* Title area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: titleHeight,
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#e0e7ff',
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title.length > 30 ? title.substring(0, 30) + '…' : title}
        </span>
        <span style={{ color: '#a5b4fc', fontSize: 16, fontWeight: 400, marginTop: 4 }}>
          by {username} · audioshlf
        </span>
      </div>

      {/* Hero cover */}
      <img
        src={covers[0]?.src}
        width={heroW}
        height={heroH}
        style={{ objectFit: 'cover', borderRadius: 12 }}
      />

      {/* 3 small covers row */}
      <div style={{ display: 'flex', gap }}>
        {covers.slice(1, 4).map((cover, i) => (
          <img
            key={i}
            src={cover.src}
            width={smallW}
            height={smallH}
            style={{ objectFit: 'cover', borderRadius: 8 }}
          />
        ))}
      </div>
    </div>
  )
}

registerTemplate({
  id: 'hero',
  name: 'Hero',
  description: 'One large cover with smaller books alongside',
  slotCount: 4,
  supportedSizes: ['og', 'square'],
  getSlotSpecs,
  Component: HeroTemplate,
})

export { HeroTemplate }
