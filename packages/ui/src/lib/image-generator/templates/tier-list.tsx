/**
 * Tier List Template — S/A/B/C rows with colored backgrounds and cover images.
 *
 * OG (1200×630):  4 rows, 5 covers per row (label + 5 slots)
 * Square (1080×1080): 4 rows, 3 covers per row (label + 3 slots)
 *
 * Only available for TIER list type.
 *
 * Satori-compatible: flexbox only, no hooks, explicit image dimensions.
 */

import React from "react";
import { SIZE_PRESETS } from "../presets";
import { registerTemplate, type TemplateProps, type SlotSpec } from "./registry";

const TIER_ROWS = [
  { label: "S", bg: "#dc2626", labelBg: "#b91c1c" }, // Red
  { label: "A", bg: "#ea580c", labelBg: "#c2410c" }, // Orange
  { label: "B", bg: "#eab308", labelBg: "#ca8a04" }, // Yellow
  { label: "C", bg: "#16a34a", labelBg: "#15803d" }, // Green
];

function getSlotSpecs(preset: "og" | "square"): SlotSpec[] {
  const { width, height } = SIZE_PRESETS[preset];
  const isOg = preset === "og";
  const titleHeight = isOg ? 60 : 80;
  const rows = 4;
  const coversPerRow = isOg ? 5 : 3;
  const labelWidth = isOg ? 200 : 240;
  const gap = 4;
  const contentH = height - gap * 2;
  const contentW = width - gap * 2;
  const rowHeight = Math.floor((contentH - titleHeight - gap * rows) / rows);
  const coverW = Math.floor((contentW - labelWidth - gap * 2 - gap * (coversPerRow - 1)) / coversPerRow);
  const coverH = rowHeight - gap * 2;

  const slots: SlotSpec[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < coversPerRow; c++) {
      slots.push({
        id: `tier-${r}-slot-${c}`,
        w: coverW,
        h: coverH,
      });
    }
  }
  return slots;
}

function TierListTemplate({
  width,
  height,
  title,
  username,
  covers,
  tiers,
}: TemplateProps): React.ReactElement {
  const isOg = width > height;
  const titleHeight = isOg ? 60 : 80;
  const rows = 4;
  const coversPerRow = isOg ? 5 : 3;
  const labelWidth = isOg ? 200 : 240;
  const gap = 4;
  const contentH = height - gap * 2;
  const contentW = width - gap * 2;
  const rowHeight = Math.floor((contentH - titleHeight - gap * rows) / rows);
  const coverW = Math.floor((contentW - labelWidth - gap * 2 - gap * (coversPerRow - 1)) / coversPerRow);
  const coverH = rowHeight - gap * 2;

  // Use actual tier labels if provided, otherwise defaults
  const tierLabels =
    tiers && tiers.length >= 4
      ? tiers.slice(0, 4).map((t) => t.label)
      : TIER_ROWS.map((r) => r.label);

  // Distribute covers across tiers
  // If tier data is provided, use coverCounts; otherwise distribute evenly
  let coverOffsets: number[] = [];
  let coverCounts: number[] = [];
  if (tiers && tiers.length >= 5) {
    let offset = 0;
    for (let r = 0; r < rows; r++) {
      coverOffsets.push(offset);
      const count = Math.min(tiers[r]?.coverCount ?? 0, coversPerRow);
      coverCounts.push(count);
      offset += tiers[r]?.coverCount ?? 0;
    }
  } else {
    // Evenly distribute placeholder covers
    for (let r = 0; r < rows; r++) {
      coverOffsets.push(r * coversPerRow);
      coverCounts.push(coversPerRow);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: "#1a1a2e",
        fontFamily: "Inter",
        gap,
        padding: gap,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: titleHeight,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              color: "#f8fafc",
              fontSize: isOg ? 22 : 28,
              fontWeight: 700,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title.length > 40 ? title.substring(0, 40) + "…" : title}
          </span>
          <span
            style={{
              color: "#94a3b8",
              fontSize: isOg ? 12 : 14,
              fontWeight: 400,
            }}
          >
            by {username} · audioshlf
          </span>
        </div>
      </div>

      {/* Tier rows */}
      {TIER_ROWS.map((tier, rowIdx) => {
        const label = tierLabels[rowIdx] || tier.label;
        const offset = coverOffsets[rowIdx] ?? rowIdx * coversPerRow;
        const count = coverCounts[rowIdx] ?? coversPerRow;

        return (
          <div
            key={rowIdx}
            style={{
              display: "flex",
              height: rowHeight,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {/* Tier label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: labelWidth,
                backgroundColor: tier.labelBg,
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontSize: isOg ? 36 : 44,
                  fontWeight: 700,
                  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                {label}
              </span>
            </div>

            {/* Cover slots */}
            <div
              style={{
                display: "flex",
                flex: 1,
                backgroundColor: tier.bg,
                alignItems: "center",
                gap,
                paddingLeft: gap,
                paddingRight: gap,
              }}
            >
              {Array.from({ length: coversPerRow }).map((_, colIdx) => {
                const coverIdx = offset + colIdx;
                const cover = colIdx < count ? covers[coverIdx] : null;

                return cover ? (
                  <img
                    key={colIdx}
                    src={cover.src}
                    width={coverW}
                    height={coverH}
                    style={{
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                ) : (
                  <div
                    key={colIdx}
                    style={{
                      width: coverW,
                      height: coverH,
                      borderRadius: 6,
                      opacity: 0,
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

registerTemplate({
  id: "tier-list",
  name: "Tier List",
  description: "Classic S/A/B/C tier rows with colored backgrounds",
  slotCount: 20,
  supportedSizes: ["og", "square"],
  listTypes: ["TIER"],
  getSlotSpecs,
  Component: TierListTemplate,
});

export { TierListTemplate };
