# Feature: List Image Generation, Templates, S3 Upload, and Sharing

## Overview
Add automated image generation to the List creation and update flow. Users select an image template (layout) that places book cover images into template-defined slots. The system generates standard share-friendly image sizes, uploads them to S3, stores resulting URLs in the database, and uses the OG image for social previews. A Share UI provides quick actions to copy link, download images, and share to common platforms.

## Goals
1. Users can choose from multiple image templates when creating or editing a list.
2. Templates are reusable components that can be previewed in the UI.
3. On Save, the server generates images when missing or when the user requests regeneration.
4. Generate at least two standard sizes:
   - Open Graph: 1200x630 (primary for link previews)
   - Square: 1080x1080 (primary for Instagram/general posting)
5. Upload generated PNGs to S3 and store their URLs (and metadata) in the database.
6. List view displays the generated image above the list.
7. Share action provides:
   - Copy link
   - Download OG image
   - Download square image
   - Share links for Reddit, Facebook, X, LinkedIn (and an extendable pattern)

## Non-goals
- Implementing the browser extension or scraper logic.
- Building a full CloudFront CDN setup (optional later).
- Real-time background job queue (can be added later; implement synchronous generation first unless timeouts are encountered).

## Key Decisions

### Image versioning strategy
**Decision:** use app-level versioning plus S3 bucket versioning as a safety net.

**Rationale:**
- Social platforms cache OG images aggressively. If the URL never changes, updated images may not refresh.
- App-level versioning creates immutable URLs per list update and avoids cache confusion.
- S3 versioning remains enabled for accidental overwrite protection.

**Implementation:**
- Maintain `imageVersion` integer on the List record.
- Each generation increments `imageVersion` and writes images under:
  - `lists/{listId}/v{imageVersion}/og.png`
  - `lists/{listId}/v{imageVersion}/square.png`

## User Experience

### Create List Flow
1. User creates a list, selects/arranges books, enters title (and optional description).
2. User chooses an image template.
3. UI shows a live preview of selected template using the chosen covers.
4. On Save:
   - List is persisted.
   - Image generation kicks off if no images exist.

### Edit List Flow
- User can reorder books, change title/description, change template.
- Add checkbox or action: "Regenerate image" (default ON when order/template/title changes).
- On Save, images regenerate only if:
  - No images exist OR
  - Regenerate requested OR
  - Template changed OR
  - Order changed OR
  - Title/description changed (affects image text)

### List View
- Generated header image displayed above list details.
- Share button available.

### Share Modal
Provides:
- Copy share link
- Download OG image (1200x630)
- Download square image (1080x1080)
- Share shortcuts: X, Facebook, Reddit, LinkedIn
- Optional: "Copy image URL" (for power users)

## Template System

### Template catalog
Define a template registry with:
- `id` string
- `name` string
- `description` string (optional)
- `slotCount` number (how many covers are required/used)
- `supportedSizes` array: `["og", "square"]` (extensible)
- `component` React component used by both UI preview rendering and server-side Satori rendering

### Template behavior
- Templates define "slots" and rules for how covers fill them:
  - Example: grid 3x3 uses first 9 covers
- Each slot defines:
  - position and size within canvas
  - object fit rule: cover must fill area (crop as needed)

### Preview rendering
- UI preview uses the same template component.
- Goal: reuse the same layout definition to avoid divergence.

## Image Generation Implementation

### Tech choice
Use Satori + Resvg for server-side generation:
- Templates written as React components.
- Render to SVG using Satori.
- Convert SVG to PNG using Resvg.

### Image generation function contract
Create a single server-side module: `lib/image-generator/generateListImage.ts`

**Inputs:**
- `templateId`
- `sizePreset`: `"og"` or `"square"`
- `list`: `{ id, title, description?, username, books: [{ coverImageUrl, title? }] }`
- `options`: `{ imageVersion, slotCountOverride? }`

**Process:**
1. Determine template and size preset dimensions
2. Select covers: first N covers required by template
3. Fetch cover images server-side
4. Resize/crop covers to match slot aspect ratios (must fill)
5. Render template layout to SVG
6. Convert to PNG buffer
7. Return PNG buffer and metadata

**Outputs:**
- `{ buffer: Buffer, width, height, contentType: "image/png" }`

### Size presets
- og: 1200x630
- square: 1080x1080

## S3 Upload

### Path convention (with app versioning)
- `lists/{listId}/v{imageVersion}/og.png`
- `lists/{listId}/v{imageVersion}/square.png`

### Upload details
- Content-Type: `image/png`
- Cache-Control: `public, max-age=31536000, immutable` (for versioned assets)
- Bucket remains private (Block Public Access ON)

### URL strategy
- Persist `s3Key` for each generated image.
- At runtime, generate signed URLs for downloads and OG metadata when needed.

## Database Changes

### List table additions
- `imageTemplateId` (string, required after feature launch)
- `imageVersion` (int, default 1)
- `imageOgKey` (string, nullable)
- `imageSquareKey` (string, nullable)
- `imageGeneratedAt` (datetime, nullable)
- `imageStatus` (enum: `none | generating | ready | failed`)
- `imageError` (text, nullable)

## API and Server Actions

### List create/update
On list save:
1. Persist list changes (title, description, books, template)
2. Decide whether to generate images
3. If generating:
   - Increment `imageVersion`
   - Set `imageStatus = generating`
   - Generate og + square
   - Upload both to S3
   - Update DB with keys, timestamps, `status = ready`
4. On failure: Set `imageStatus = failed`, store `imageError`

### Regenerate endpoint
- `POST /api/lists/{id}/regenerate-images`

## Share Page Metadata (OG + Twitter)

### Next.js App Router metadata
Implement `generateMetadata()` in the list share page route.

**Metadata requirements:**
- `openGraph.images` should include OG image URL
- `twitter.card = "summary_large_image"`
- Title and description based on list content

**URL resolution:**
- If image keys exist: generate signed URL for `og.png`
- If images not ready: fall back to a default OG image

## Share Modal Details

### Actions
- Copy link: `navigator.clipboard.writeText(shareUrl)`
- Download OG: direct link to signed URL (or proxy route)
- Download square: direct link to signed URL (or proxy route)

### Social share links
Generate URLs using `shareUrl` and optional prefilled text:
- X: intent tweet
- Facebook: sharer
- Reddit: submit
- LinkedIn: shareArticle

## Error Handling and Edge Cases
- If fewer covers than template slots: Fill remaining slots with placeholder tile
- If cover fetch fails: Use placeholder for that slot
- If generation fails: List still saves; show "Image failed to generate" with retry
- Rate limiting: Basic cooldown per list (30 seconds)

## Acceptance Criteria
1. User can select a template during list creation and see a preview.
2. Saving a new list generates OG and square images and stores S3 keys in DB.
3. List view shows the generated image above the list.
4. Share modal includes copy link, download OG, download square, and at least 4 social share shortcuts.
5. Share page link previews show the correct OG image via metadata.
6. Editing list order/template/title can trigger regeneration and results in a new versioned image path.
7. Image generation uses Satori + Resvg and templates are reusable React components.

## Server-Side Image Generation Spec

### Architecture Modules
Create folder: `lib/image-generator/`
- `templates/registry.ts` - Template registry metadata and component mapping
- `templates/<templateId>.tsx` - Template components
- `presets.ts` - Size presets and constants
- `covers.ts` - Fetch, decode, resize/crop, and base64 encode covers
- `render.ts` - Satori render SVG + Resvg PNG conversion
- `generateListImages.ts` - Orchestrator

Optional utility folder: `lib/s3/` for upload integration.

### Template Registry Contract
Each template entry:
- `id`: string
- `name`: string
- `slotCount`: number
- `supportedSizes`: array of presets
- `Component`: React component accepting `TemplateProps`

### TemplateProps
- `width`, `height`
- `title`, `description?`, `username`
- `covers`: array of `CoverAsset` objects

### CoverAsset
- `src`: string (data URL for Satori)
- `isPlaceholder`: boolean

### Slot spec (Approach A - recommended)
Each template provides `getSlotSpecs(preset): SlotSpec[]`:
- `id`: string
- `w`: number
- `h`: number

### Cover Fetching
- Fetch server-side with `fetch()` (Node runtime)
- Timeout per image: 5-10 seconds
- Concurrency: 4-6 parallel fetches
- Encode as data URLs for Satori embedding

### Placeholder Generation
- SVG data URL or inline JSX
- Neutral background with app branding
- Used when: fewer books than slots, fetch fails, URL missing

### Rendering: Satori + Resvg
1. Build TemplateProps
2. Call Satori to render SVG
3. Convert SVG to PNG with Resvg
4. Return PNG buffer

### Fonts
- Inter Regular + Bold (TTF files)
- Cached in memory after first load
- Stored in `assets/fonts/`

### Generator Orchestrator
`generateListImages(list, options) => GeneratedImages`

**Output:** `{ og: { buffer, contentType, width, height }, square: { ... } }`

### Performance Limits
- Max covers: template slotCount (3-12)
- Concurrency: 4-6 parallel fetches
- Timeouts: 5-10 seconds per fetch
- Cache fonts in memory

## Environment Variables
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`

## Initial Templates
1. **Grid 3x3** - 9 covers in a grid layout
2. **Hero layout** - one large cover + smaller strip
3. **Minimal banner** - text + 3 covers
