# Research: List Image Generation, Templates, S3 Upload, and Sharing

**Date**: 2026-02-21 | **Feature**: 007-list-image-sharing

## R1: Image Generation Technology Choice

**Decision**: Use raw `satori` + `@resvg/resvg-js` (native napi-rs variant).

**Rationale**:
- `@vercel/og` bundles an older satori (0.16.0) and uses the slower WASM-based `@resvg/resvg-wasm`. We need the Node.js runtime for `fs.readFile` (fonts), AWS SDK (S3 upload), and batch image fetching.
- Native `@resvg/resvg-js` is ~2x faster than WASM variant for PNG conversion.
- Raw satori gives full control over the render pipeline (generate buffer, then upload to S3), whereas `@vercel/og`'s `ImageResponse` is designed for HTTP responses only.

**Alternatives considered**:
- `@vercel/og` / `next/og`: Rejected because it targets Edge runtime, bundles slower WASM resvg, and doesn't support generate-then-upload workflows.
- `puppeteer` / `playwright`: Rejected as extreme overkill; requires headless browser, far more memory, and slower.
- `canvas` (node-canvas): Rejected; requires system-level dependencies (Cairo), harder to deploy in Docker.

## R2: Satori Constraints and Gotchas

**Decision**: Template components must use Satori-compatible JSX subset.

**Key constraints**:
- **Flexbox only** — no CSS Grid, no `z-index`, no `calc()`, no 3D transforms. All elements default to `display: flex`.
- **No React hooks** — components must be pure JSX (no `useState`, `useEffect`, etc.)
- **Image `<img>` elements** must have explicit `width` and `height` props.
- **Font format** — TTF or OTF only. WOFF2 is NOT supported.
- **Remote images** — satori CAN fetch remote URLs but this is unreliable (CORS, timeouts, CDN issues). Pre-fetch and encode as data URLs for reliability.

**Rationale**: These constraints shape how templates are built. The same component works for both UI preview (React) and server rendering (Satori) as long as the subset is respected.

## R3: Font Loading Strategy

**Decision**: Store Inter TTF files in `/packages/ui/fonts/`, load with `fs.readFile`, cache at module scope.

**Rationale**:
- Fonts must be provided as `ArrayBuffer` to satori. Loading from disk with `fs.readFile` is most reliable on Node.js runtime.
- Module-scope caching avoids re-reading fonts on every generation. Satori internally caches font instances via WeakMap keyed by array reference.
- `public/` directory is wrong — it serves files to the browser. Fonts are server-only assets.

**Alternatives considered**:
- Google Fonts API fetch: Rejected — adds network dependency to generation pipeline.
- `fetch(new URL('./fonts/...', import.meta.url))`: Works but more complex than `fs.readFile`.

## R4: Cover Image Embedding

**Decision**: Pre-fetch remote cover images server-side, convert to base64 data URLs before passing to satori.

**Rationale**:
- Satori's built-in remote image fetching is unreliable with CDN-hosted images (Amazon Media).
- Pre-fetching gives full control over error handling, timeouts, and placeholders.
- Data URLs are self-contained and avoid double-fetch when resvg converts SVG to PNG.
- Fetch concurrency limited to 4-6 parallel requests to avoid overwhelming source servers.

**Alternatives considered**:
- Passing remote URLs directly to satori `src`: Rejected due to reliability issues with Amazon CDN images.
- Caching fetched images to disk: Overkill for v1; in-memory per-request is sufficient.

## R5: S3 Upload Strategy

**Decision**: Server-side upload via `PutObjectCommand`, presigned URLs for downloads, versioned paths.

**Rationale**:
- Images are generated server-side, so direct upload via AWS SDK is the natural approach.
- Presigned URLs allow serving from a private bucket without making it public.
- App-level versioning (`lists/{listId}/v{imageVersion}/og.png`) ensures social platforms pick up updated images (they cache aggressively by URL).
- `Cache-Control: public, max-age=31536000, immutable` on versioned assets enables aggressive CDN/browser caching.

**Key concern — OG images and presigned URLs**: Presigned URLs expire (max 7 days). Social media crawlers need permanent URLs. Two solutions:
1. **Proxy route** (recommended for v1): Create `/api/lists/[listId]/og-image` that generates a signed URL and redirects (302). The OG meta tag points to this permanent route. Social crawlers follow the redirect.
2. **Public bucket / CloudFront** (future): Make images publicly readable for permanent URLs.

**Alternatives considered**:
- Public S3 bucket: Simpler but less secure. Can add later with CloudFront.
- Client-side upload via presigned URLs: Unnecessary — images are generated server-side.

## R6: Social Share URL Patterns

**Decision**: Implement share utilities as a small module generating URLs for X, Facebook, Reddit, LinkedIn.

**URL patterns**:
- **X (Twitter)**: `https://twitter.com/intent/tweet?text={text}&url={url}`
- **Facebook**: `https://www.facebook.com/sharer/sharer.php?u={url}` (only accepts `u` parameter; pulls everything else from OG tags)
- **Reddit**: `https://www.reddit.com/submit?url={url}&title={title}`
- **LinkedIn**: `https://www.linkedin.com/shareArticle?mini=true&url={url}`

**OG meta tags required** (all platforms):
- `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- `twitter:card = "summary_large_image"` for large image preview on X

## R7: Image Dimensions

**Decision**: Generate two sizes — OG (1200x630) and Square (1080x1080).

**Rationale**:
- **1200x630** is the universal standard for OG images. Works optimally on Facebook, LinkedIn, X, Slack, Discord.
- **1080x1080** is the standard for Instagram and general social posting.
- Both are widely supported across all major platforms.

## R8: Next.js Configuration Requirements

**Decision**: Add `@resvg/resvg-js` to `serverExternalPackages` in `next.config.ts`.

**Rationale**: `@resvg/resvg-js` is a native Node.js module (compiled `.node` binary). Webpack/Turbopack cannot bundle it. The `serverExternalPackages` config tells Next.js to use native `require()` instead.

## R9: Packages to Install

| Package | Version | Purpose |
|---------|---------|---------|
| `satori` | ^0.19.2 | JSX to SVG conversion |
| `@resvg/resvg-js` | ^2.6.2 | SVG to PNG (native, fastest) |
| `@aws-sdk/client-s3` | ^3.x | S3 PutObject, GetObject |
| `@aws-sdk/s3-request-presigner` | ^3.x | Generate signed download URLs |

**NOT needed**: `@vercel/og`, `@resvg/resvg-wasm`, `sharp`, `canvas`, `puppeteer`.

## R10: OG Image Serving for Social Crawlers

**Decision**: Use a proxy API route (`/api/lists/[listId]/og-image`) that redirects to a fresh signed URL.

**Rationale**:
- Social media crawlers (Facebook, X, LinkedIn) fetch OG images when a link is shared.
- Presigned URLs expire, so the OG meta tag cannot point directly to one.
- A proxy route generates a new signed URL on each request and returns a 302 redirect.
- The proxy route URL is stable/permanent and can be used in `og:image` meta tags.
- Future optimization: Replace with CloudFront for direct serving without redirect.

**Alternatives considered**:
- Making S3 bucket public: Works but less secure. Good future upgrade path.
- Embedding image as base64 in meta tags: Not supported by social crawlers.
- Caching signed URLs server-side: Complex; proxy route is simpler and sufficient.
