/**
 * Minimal Banner Template — text-focused with 3 covers on the side.
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
  const padding = isOg ? 40 : 48

  if (isOg) {
    // OG: 3 covers on the right side, vertically stacked
    const coverAreaWidth = Math.floor(width * 0.35)
    const gap = 10
    const coverW = coverAreaWidth - padding
    const coverH = Math.floor((height - padding * 2 - gap * 2) / 3)

    return [
      { id: 'cover-0', w: coverW, h: coverH },
      { id: 'cover-1', w: coverW, h: coverH },
      { id: 'cover-2', w: coverW, h: coverH },
    ]
  }

  // Square: 3 covers at the bottom in a row
  const gap = 10
  const coverH = Math.floor(height * 0.35)
  const coverW = Math.floor((width - padding * 2 - gap * 2) / 3)

  return [
    { id: 'cover-0', w: coverW, h: coverH },
    { id: 'cover-1', w: coverW, h: coverH },
    { id: 'cover-2', w: coverW, h: coverH },
  ]
}

function MinimalBannerTemplate({
  width,
  height,
  title,
  description,
  username,
  covers,
}: TemplateProps): React.ReactElement {
  const isOg = width > height
  const padding = isOg ? 40 : 48
  const gap = 10

  if (isOg) {
    // OG layout: text on left, 3 covers stacked on right
    const coverAreaWidth = Math.floor(width * 0.35)
    const coverW = coverAreaWidth - padding
    const coverH = Math.floor((height - padding * 2 - gap * 2) / 3)

    return (
      <div
        style={{
          display: 'flex',
          width,
          height,
          backgroundColor: '#fafaf9',
          fontFamily: 'Inter',
        }}
      >
        {/* Text area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            padding,
            paddingRight: padding / 2,
          }}
        >
          <span
            style={{
              color: '#a16207',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            audioshlf
          </span>
          <span
            style={{
              color: '#1c1917',
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title.length > 45 ? title.substring(0, 45) + '…' : title}
          </span>
          {description && (
            <span
              style={{
                color: '#78716c',
                fontSize: 16,
                fontWeight: 400,
                lineHeight: 1.4,
                marginBottom: 16,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {description.length > 100
                ? description.substring(0, 100) + '…'
                : description}
            </span>
          )}
          <span
            style={{
              color: '#a8a29e',
              fontSize: 14,
              fontWeight: 400,
            }}
          >
            by {username}
          </span>
        </div>

        {/* Cover area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap,
            padding,
            paddingLeft: padding / 2,
          }}
        >
          {covers.slice(0, 3).map((cover, i) => (
            <img
              key={i}
              src={cover.src}
              width={coverW}
              height={coverH}
              style={{ objectFit: 'cover', borderRadius: 8 }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Square layout: text on top, 3 covers in a row at bottom
  const coverH = Math.floor(height * 0.35)
  const coverW = Math.floor((width - padding * 2 - gap * 2) / 3)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        backgroundColor: '#fafaf9',
        fontFamily: 'Inter',
        padding,
      }}
    >
      {/* Text area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <span
          style={{
            color: '#a16207',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          audioshlf
        </span>
        <span
          style={{
            color: '#1c1917',
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 16,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title.length > 35 ? title.substring(0, 35) + '…' : title}
        </span>
        {description && (
          <span
            style={{
              color: '#78716c',
              fontSize: 18,
              fontWeight: 400,
              lineHeight: 1.4,
              marginBottom: 20,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {description.length > 120
              ? description.substring(0, 120) + '…'
              : description}
          </span>
        )}
        <span
          style={{
            color: '#a8a29e',
            fontSize: 16,
            fontWeight: 400,
          }}
        >
          by {username}
        </span>
      </div>

      {/* Cover row */}
      <div style={{ display: 'flex', gap, marginTop: gap }}>
        {covers.slice(0, 3).map((cover, i) => (
          <img
            key={i}
            src={cover.src}
            width={coverW}
            height={coverH}
            style={{ objectFit: 'cover', borderRadius: 8 }}
          />
        ))}
      </div>
    </div>
  )
}

registerTemplate({
  id: 'minimal-banner',
  name: 'Minimal',
  description: 'Text-focused with 3 covers on the side',
  slotCount: 3,
  supportedSizes: ['og', 'square'],
  getSlotSpecs,
  Component: MinimalBannerTemplate,
})

export { MinimalBannerTemplate }
