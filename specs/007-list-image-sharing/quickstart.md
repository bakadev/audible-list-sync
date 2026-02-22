# Quickstart: List Image Generation & Sharing

**Date**: 2026-02-21 | **Feature**: 007-list-image-sharing

## Prerequisites

- Node.js 18+
- PostgreSQL running (via Docker Compose)
- AWS credentials configured in `.env` (already present):
  - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`

## Setup

### 1. Install new dependencies

```bash
cd packages/ui
pnpm add satori @resvg/resvg-js @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Download fonts

Download Inter font files (TTF format, NOT WOFF2) and place in `packages/ui/fonts/`:

```bash
mkdir -p packages/ui/fonts
# Download Inter Regular and Bold TTF files
curl -L -o packages/ui/fonts/Inter-Regular.ttf "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf"
curl -L -o packages/ui/fonts/Inter-Bold.ttf "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.ttf"
```

### 3. Update Next.js config

Add `@resvg/resvg-js` to `serverExternalPackages` in `packages/ui/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['@resvg/resvg-js'],
  images: {
    remotePatterns: [
      // ... existing patterns
    ],
  },
};
```

### 4. Run database migration

```bash
cd packages/ui
npx prisma migrate dev --name add_list_image_fields
```

This adds the `ImageStatus` enum and image-related fields to the `List` table.

### 5. Verify S3 access

Ensure the S3 bucket exists and credentials have `s3:PutObject` and `s3:GetObject` permissions:

```bash
# Quick test (requires AWS CLI)
echo "test" | aws s3 cp - s3://audioshlf-lists/test.txt --region us-east-1
aws s3 rm s3://audioshlf-lists/test.txt --region us-east-1
```

## Development Workflow

### Start the dev server

```bash
cd packages/ui
pnpm dev
```

### Key URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/lists/new` | Create list with template picker |
| `http://localhost:3000/lists/[id]/edit` | Edit list, change template, regenerate |
| `http://localhost:3000/[username]/lists/[id]` | Public list view with header image |
| `http://localhost:3000/api/templates` | List available templates |
| `http://localhost:3000/api/lists/[id]/og-image` | OG image proxy (redirect to S3) |

### Testing image generation

1. Create or edit a list with at least 3 books
2. Select a template from the picker
3. Save the list — images generate automatically
4. Check the public list view for the header image
5. Test sharing: open the share modal, copy link, paste into social media debug tools:
   - X Card Validator: https://cards-dev.twitter.com/validator
   - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

## File Structure

```text
packages/ui/
├── fonts/
│   ├── Inter-Regular.ttf          # Satori font (server-only)
│   └── Inter-Bold.ttf             # Satori font (server-only)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── lists/
│   │   │   │   ├── [listId]/
│   │   │   │   │   ├── og-image/route.ts       # OG image proxy
│   │   │   │   │   ├── square-image/route.ts   # Square image proxy
│   │   │   │   │   └── regenerate-images/route.ts  # Manual regeneration
│   │   │   │   └── route.ts                    # Modified: template support
│   │   │   └── templates/route.ts              # Template registry endpoint
│   │   └── [username]/
│   │       └── lists/[listId]/page.tsx          # Modified: OG metadata + header image
│   ├── components/
│   │   ├── lists/
│   │   │   ├── template-picker.tsx             # Template selection UI
│   │   │   ├── template-preview.tsx            # Live preview component
│   │   │   └── share-modal.tsx                 # Share dialog
│   │   └── ui/
│   │       └── dialog.tsx                      # shadcn dialog (already exists)
│   └── lib/
│       ├── image-generator/
│       │   ├── presets.ts                      # Size preset constants
│       │   ├── covers.ts                       # Cover fetch + base64 encoding
│       │   ├── render.ts                       # Satori SVG + Resvg PNG
│       │   ├── fonts.ts                        # Font loader with caching
│       │   ├── generateListImages.ts           # Orchestrator
│       │   └── templates/
│       │       ├── registry.ts                 # Template registry
│       │       ├── grid-3x3.tsx                # Grid 3x3 template
│       │       ├── hero.tsx                    # Hero template
│       │       └── minimal-banner.tsx          # Minimal banner template
│       ├── s3.ts                               # S3 client, upload, signed URLs
│       └── share.ts                            # Social share URL utilities
└── prisma/
    └── schema.prisma                           # Modified: image fields
```

## Environment Variables

Already configured in `.env`:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET=audioshlf-lists
```

No new environment variables needed.
