# my-audible-lists Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-11

## Active Technologies
- JavaScript ES6+ (no TypeScript, no build tools - native Chrome compatibility) (002-audible-extension)
- chrome.storage.local (extension's local storage API) (002-audible-extension)
- JavaScript ES6+ (browser environment, Chrome Manifest V3) + Chrome Extension APIs (storage, content scripts), React 19 (CDN for overlay UI) (003-simplify-extension)
- chrome.storage.local (extension settings and scraped data persistence) (003-simplify-extension)
- TypeScript 5.x (Next.js 19, React 19) + Next.js 19, React 19, Prisma ORM, NextAuth, TailwindCSS, shadcn/ui (004-admin-dashboard)
- PostgreSQL 14+ (via Docker Compose) (004-admin-dashboard)
- TypeScript 5.9+ (extension & Next.js web app) (005-extension-auto-sync)
- PostgreSQL (existing database, no schema changes needed) (005-extension-auto-sync)
- TypeScript 5.x (strict mode), JavaScript ES2020 + Next.js 16 (App Router), React 19, Prisma 6, TailwindCSS 4, shadcn/ui, @hello-pangea/dnd (drag-and-drop) (006-user-lists)
- PostgreSQL 14+ (via Docker Compose), Audnexus API (book metadata) (006-user-lists)
- TypeScript 5.x (strict mode) + Next.js 16 (App Router), React 19, Prisma 6 + satori (^0.19.2), @resvg/resvg-js (^2.6.2), @aws-sdk/client-s3 (^3.x), @aws-sdk/s3-request-presigner (^3.x), Inter font TTF files (007-list-image-sharing)
- PostgreSQL 14+ (via Prisma — new fields on existing List model), AWS S3 (`audioshlf-lists` bucket, private, app-level versioning) (007-list-image-sharing)

- TypeScript 5.x (strict mode) for ui/shared packages, JavaScript ES2020 for extension + Next.js 14+ (App Router), Auth.js (NextAuth), Prisma 5+, Tailwind CSS, shadcn/ui (001-library-sync-mvp)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (strict mode) for ui/shared packages, JavaScript ES2020 for extension: Follow standard conventions

## Recent Changes
- 007-list-image-sharing: Added TypeScript 5.x (strict mode) + Next.js 16 (App Router), React 19, Prisma 6 + satori (^0.19.2), @resvg/resvg-js (^2.6.2), @aws-sdk/client-s3 (^3.x), @aws-sdk/s3-request-presigner (^3.x), Inter font TTF files
- 006-user-lists: Added TypeScript 5.x (strict mode), JavaScript ES2020 + Next.js 16 (App Router), React 19, Prisma 6, TailwindCSS 4, shadcn/ui, @hello-pangea/dnd (drag-and-drop)
- 005-extension-auto-sync: Added TypeScript 5.9+ (extension & Next.js web app)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
