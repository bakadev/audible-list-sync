# Data Model: List Image Generation & Sharing

**Date**: 2026-02-21 | **Feature**: 007-list-image-sharing

## Schema Changes

### Modified: `List` model

Add the following fields to the existing `List` model in `packages/ui/prisma/schema.prisma`:

```prisma
model List {
  // --- existing fields ---
  id          String    @id @default(cuid())
  userId      String
  name        String
  description String?   @db.Text
  type        ListType
  tiers       Json?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // --- new fields for image generation ---
  imageTemplateId  String?                          // Selected template ID (e.g., "grid-3x3", "hero", "minimal-banner")
  imageVersion     Int          @default(0)         // Incremented on each generation for cache busting
  imageOgKey       String?                          // S3 object key for OG image (1200x630)
  imageSquareKey   String?                          // S3 object key for square image (1080x1080)
  imageGeneratedAt DateTime?                        // Timestamp of last successful generation
  imageStatus      ImageStatus  @default(NONE)      // Current generation status
  imageError       String?      @db.Text            // Error message if generation failed

  // --- relations ---
  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items ListItem[]

  @@index([userId])
}
```

### New: `ImageStatus` enum

```prisma
enum ImageStatus {
  NONE        // No image has been generated
  GENERATING  // Generation in progress
  READY       // Image generated and uploaded successfully
  FAILED      // Generation failed (check imageError)
}
```

## Field Descriptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `imageTemplateId` | String? | null | ID of the selected image template from the template registry. Null means no template selected yet. |
| `imageVersion` | Int | 0 | App-level version counter. Incremented on each generation to create unique S3 paths and bust social media OG image caches. |
| `imageOgKey` | String? | null | S3 object key for the OG-sized image (1200x630). Format: `lists/{listId}/v{imageVersion}/og.png` |
| `imageSquareKey` | String? | null | S3 object key for the square image (1080x1080). Format: `lists/{listId}/v{imageVersion}/square.png` |
| `imageGeneratedAt` | DateTime? | null | Timestamp of last successful image generation. Used for cooldown enforcement and display. |
| `imageStatus` | ImageStatus | NONE | Current status of image generation. Transitions: NONE → GENERATING → READY or FAILED. |
| `imageError` | String? | null | Error description if generation failed. Cleared on next successful generation. |

## S3 Key Convention

```
lists/{listId}/v{imageVersion}/og.png       # 1200x630 Open Graph image
lists/{listId}/v{imageVersion}/square.png   # 1080x1080 Square image
```

Example: `lists/clxyz123/v3/og.png`

## State Transitions

```
NONE ──→ GENERATING ──→ READY
              │
              └──→ FAILED ──→ GENERATING (retry)
                                   │
READY ──→ GENERATING ──→ READY     └──→ READY or FAILED
```

### Transition Rules

| From | To | Trigger |
|------|----|---------|
| NONE | GENERATING | First image generation (list save with template selected) |
| GENERATING | READY | Generation + S3 upload complete |
| GENERATING | FAILED | Generation error or S3 upload error |
| READY | GENERATING | Regeneration triggered (content/template change) |
| FAILED | GENERATING | Manual retry or re-save |

## Generation Trigger Conditions

Images should be (re)generated when ANY of these conditions are true:
1. `imageStatus` is `NONE` and `imageTemplateId` is set
2. `imageTemplateId` changed from previous value
3. List items (books) order or composition changed
4. List `name` or `description` changed (they appear on the image)
5. User explicitly requests regeneration

## Validation Rules

| Rule | Constraint |
|------|-----------|
| `imageTemplateId` | Must be a valid ID from the template registry, or null |
| `imageVersion` | Non-negative integer, auto-incremented |
| `imageOgKey`, `imageSquareKey` | Valid S3 key format when set |
| Regeneration cooldown | Minimum 30 seconds between generation requests per list |

## Template Registry (Application-Level, Not DB)

Templates are defined in code, not the database. The template registry is a static map:

```typescript
interface TemplateRegistryEntry {
  id: string;
  name: string;
  description?: string;
  slotCount: number;
  supportedSizes: ('og' | 'square')[];
  getSlotSpecs: (preset: 'og' | 'square') => SlotSpec[];
  Component: React.FC<TemplateProps>;
}

interface SlotSpec {
  id: string;
  w: number;   // Width in pixels relative to preset
  h: number;   // Height in pixels relative to preset
}

interface TemplateProps {
  width: number;
  height: number;
  title: string;
  description?: string;
  username: string;
  covers: CoverAsset[];
}

interface CoverAsset {
  src: string;           // Base64 data URL
  isPlaceholder: boolean;
}
```

### Initial Templates

| ID | Name | Slot Count | Description |
|----|------|-----------|-------------|
| `grid-3x3` | Grid | 9 | 3x3 grid of book covers |
| `hero` | Hero | 4 | One large cover + 3 smaller in a strip |
| `minimal-banner` | Minimal | 3 | Text-focused with 3 covers on the side |

## Migration Plan

Single migration adding all new fields to the existing `List` table:

```sql
-- Add ImageStatus enum
CREATE TYPE "ImageStatus" AS ENUM ('NONE', 'GENERATING', 'READY', 'FAILED');

-- Add image fields to List
ALTER TABLE "List" ADD COLUMN "imageTemplateId" TEXT;
ALTER TABLE "List" ADD COLUMN "imageVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "List" ADD COLUMN "imageOgKey" TEXT;
ALTER TABLE "List" ADD COLUMN "imageSquareKey" TEXT;
ALTER TABLE "List" ADD COLUMN "imageGeneratedAt" TIMESTAMP(3);
ALTER TABLE "List" ADD COLUMN "imageStatus" "ImageStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "List" ADD COLUMN "imageError" TEXT;
```

All new fields are nullable or have defaults, so the migration is non-destructive and backward-compatible with existing lists.
