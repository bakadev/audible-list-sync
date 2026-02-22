/**
 * Hero+ Template — 1 large cover + 6 smaller covers, with title/username.
 *
 * OG:     Hero on left, 3 rows × 2 columns on the right.
 * Square: 3 small on top, hero in the middle, 3 small on the bottom.
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
  const gap = 8

  if (isOg) {
    // OG: hero on left, 3 rows × 2 cols on right
    const ogTitleHeight = 52
    const heroW = Math.floor((width - padding * 3) * 0.45)
    const heroH = height - padding * 2
    const rightW = Math.floor((width - padding * 3) - heroW)
    const smallW = Math.floor((rightW - gap) / 2)
    const smallH = Math.floor((heroH - ogTitleHeight - gap * 3) / 3)

    return [
      { id: 'hero', w: heroW, h: heroH },
      { id: 'small-0', w: smallW, h: smallH },
      { id: 'small-1', w: smallW, h: smallH },
      { id: 'small-2', w: smallW, h: smallH },
      { id: 'small-3', w: smallW, h: smallH },
      { id: 'small-4', w: smallW, h: smallH },
      { id: 'small-5', w: smallW, h: smallH },
    ]
  }

  // Square: 3 top row, hero middle, 3 bottom row
  const titleHeight = 100
  const contentH = height - titleHeight - padding * 2 - gap * 2
  const smallRowH = Math.floor(contentH * 0.2)
  const heroH = contentH - smallRowH * 2
  const heroW = width - padding * 2
  const smallW = Math.floor((heroW - gap * 2) / 3)

  return [
    { id: 'hero', w: heroW, h: heroH },
    { id: 'small-0', w: smallW, h: smallRowH },
    { id: 'small-1', w: smallW, h: smallRowH },
    { id: 'small-2', w: smallW, h: smallRowH },
    { id: 'small-3', w: smallW, h: smallRowH },
    { id: 'small-4', w: smallW, h: smallRowH },
    { id: 'small-5', w: smallW, h: smallRowH },
  ]
}

function HeroPlusTemplate({
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
    // OG layout: hero on left, title + 3 rows of 2 on right
    const ogTitleHeight = 52
    const heroW = Math.floor((width - padding * 3) * 0.45)
    const contentH = height - padding * 2
    const rightW = Math.floor((width - padding * 3) - heroW)
    const smallW = Math.floor((rightW - gap) / 2)
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <img
            src={covers[0]?.src}
            width={heroW}
            height={contentH}
            style={{ objectFit: 'cover', borderRadius: 12 }}
          />
        </div>

        {/* Right side: title + 3 rows × 2 cols */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap,
          }}
        >
          {/* Title block */}
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

          {/* Row 1 */}
          <div style={{ display: 'flex', gap }}>
            <img src={covers[1]?.src} width={smallW} height={smallH} style={{ objectFit: 'cover', borderRadius: 8 }} />
            <img src={covers[2]?.src} width={smallW} height={smallH} style={{ objectFit: 'cover', borderRadius: 8 }} />
          </div>
          {/* Row 2 */}
          <div style={{ display: 'flex', gap }}>
            <img src={covers[3]?.src} width={smallW} height={smallH} style={{ objectFit: 'cover', borderRadius: 8 }} />
            <img src={covers[4]?.src} width={smallW} height={smallH} style={{ objectFit: 'cover', borderRadius: 8 }} />
          </div>
          {/* Row 3 */}
          <div style={{ display: 'flex', gap }}>
            <img src={covers[5]?.src} width={smallW} height={smallH} style={{ objectFit: 'cover', borderRadius: 8 }} />
            <img src={covers[6]?.src} width={smallW} height={smallH} style={{ objectFit: 'cover', borderRadius: 8 }} />
          </div>
        </div>
      </div>
    )
  }

  // Square layout: 3 top, hero middle, 3 bottom
  const titleHeight = 100
  const contentH = height - titleHeight - padding * 2 - gap * 2
  const smallRowH = Math.floor(contentH * 0.2)
  const heroH = contentH - smallRowH * 2
  const heroW = width - padding * 2
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

      {/* Top row: 3 small */}
      <div style={{ display: 'flex', gap }}>
        <img src={covers[1]?.src} width={smallW} height={smallRowH} style={{ objectFit: 'cover', borderRadius: 8 }} />
        <img src={covers[2]?.src} width={smallW} height={smallRowH} style={{ objectFit: 'cover', borderRadius: 8 }} />
        <img src={covers[3]?.src} width={smallW} height={smallRowH} style={{ objectFit: 'cover', borderRadius: 8 }} />
      </div>

      {/* Hero cover */}
      <img
        src={covers[0]?.src}
        width={heroW}
        height={heroH}
        style={{ objectFit: 'cover', borderRadius: 12 }}
      />

      {/* Bottom row: 3 small */}
      <div style={{ display: 'flex', gap }}>
        <img src={covers[4]?.src} width={smallW} height={smallRowH} style={{ objectFit: 'cover', borderRadius: 8 }} />
        <img src={covers[5]?.src} width={smallW} height={smallRowH} style={{ objectFit: 'cover', borderRadius: 8 }} />
        <img src={covers[6]?.src} width={smallW} height={smallRowH} style={{ objectFit: 'cover', borderRadius: 8 }} />
      </div>
    </div>
  )
}

registerTemplate({
  id: 'hero-plus',
  name: 'Hero+',
  description: 'One large cover with six smaller books around it',
  slotCount: 7,
  supportedSizes: ['og', 'square'],
  getSlotSpecs,
  Component: HeroPlusTemplate,
})

export { HeroPlusTemplate }
