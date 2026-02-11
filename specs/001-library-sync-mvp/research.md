# Research: Audible Library Sync MVP

**Date**: 2026-02-11
**Feature**: Audible Library Sync MVP
**Purpose**: Document technology choices, rationale, and best practices

## Overview

All core technology choices were pre-selected based on project requirements. This research validates those choices and documents best practices for implementation.

## Technology Stack Research

### 1. Monorepo Tooling: Turborepo + pnpm

**Decision**: Use Turborepo for build orchestration and pnpm for package management.

**Rationale**:
- **Turborepo**: Optimizes monorepo builds with intelligent caching, parallel execution, and minimal configuration
- **pnpm**: Most efficient package manager for disk space (content-addressable storage), fast installs, strict by default (prevents phantom dependencies)
- **Integration**: Turborepo has first-class pnpm support via `turbo.json` pipeline configuration

**Alternatives Evaluated**:
- **Nx**: More feature-rich but complex for our needs (generators, affected commands, cloud caching). Overkill for 4-package monorepo.
- **Lerna**: Legacy tool, slower, less actively maintained. Turborepo is modern replacement.
- **Yarn Workspaces**: Less disk-efficient than pnpm, slightly slower installs, looser dependency resolution.

**Best Practices**:
- Define clear task dependencies in `turbo.json` (e.g., `build` depends on `^build` from dependencies)
- Use pnpm workspace protocol for inter-package dependencies: `"@audible-lists/shared": "workspace:*"`
- Cache build outputs in `.turbo/` (add to `.gitignore`)
- Use `turbo run build --filter=ui` for selective builds
- Keep Turborepo config simple (MVP doesn't need remote caching)

**Implementation Notes**:
- Root `package.json` defines workspace-wide scripts: `pnpm dev`, `pnpm build`, `pnpm lint`
- Each package has its own `package.json` with local scripts
- Turborepo orchestrates execution order based on dependency graph

---

### 2. Frontend + Backend: Next.js 14+ with App Router

**Decision**: Use Next.js App Router for unified full-stack application.

**Rationale**:
- **Unified Architecture**: Single codebase for frontend (React) + backend (API routes), simplifies deployment
- **Server Components**: Default server-side rendering reduces client JS, improves performance
- **App Router**: File-system based routing, nested layouts, streaming, Server Actions for mutations
- **TypeScript Integration**: Excellent type safety across client and server code
- **Production-Ready**: Built-in optimizations (image optimization, code splitting, static generation)

**Alternatives Evaluated**:
- **Separate React + Express**: Two deployments, code duplication for types/validation, more complex CORS/session handling
- **Remix**: Strong framework but less mature ecosystem, fewer resources, smaller community
- **SvelteKit/SolidStart**: Modern but niche, smaller package ecosystems, less documentation

**Best Practices**:
- Use Server Components by default, add `'use client'` only when needed (interactivity, hooks)
- API routes for external integrations (extension uploads), Server Actions for form submissions
- Colocate components with pages: `app/dashboard/components/SyncStatus.tsx`
- Use Route Handlers (`app/api/*/route.ts`) for REST API endpoints
- Implement middleware for auth checks on protected routes
- Use `next/image` for optimized image loading (title cover art)

**Implementation Notes**:
- `app/(auth)/` route group for login/callback pages (no dashboard layout)
- `app/dashboard/` and `app/library/` use shared layout with nav
- `app/api/sync/import/route.ts` handles extension payload POST
- Environment variables accessed via `process.env` (server-side only)

---

### 3. Authentication: Auth.js (NextAuth)

**Decision**: Use Auth.js v5 (NextAuth) with Google OAuth provider.

**Rationale**:
- **OAuth 2.0 Compliance**: Handles authorization code flow, token exchange, refresh tokens automatically
- **Next.js Integration**: Native App Router support, middleware integration, route protection
- **Database Sessions**: Stores sessions in database (required for user management, logout, session listing)
- **Type Safety**: Full TypeScript support, session type augmentation

**Alternatives Evaluated**:
- **Passport.js**: Express-focused, awkward in Next.js API routes, manual session handling
- **Lucia**: Newer auth library, less documentation, smaller community, more manual setup
- **Manual OAuth**: Error-prone (CSRF, state validation, token handling), not worth the effort

**Best Practices**:
- Use database session strategy (not JWT sessions - less secure, can't revoke)
- Store Google user ID as unique identifier (email can change)
- Configure OAuth scopes: `profile`, `email` (minimal for MVP)
- Implement session middleware to protect routes: `export { auth as middleware } from '@/lib/auth'`
- Use `auth()` helper in Server Components to access session
- Set secure session cookies: `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`

**Implementation Notes**:
- NextAuth handles `/api/auth/[...nextauth]` routes (signin, callback, signout, session)
- Prisma adapter for database sessions (`@auth/prisma-adapter`)
- Session includes user ID, email, name, image (from Google profile)
- Separate JWT auth for extension API calls (not NextAuth JWTs)

---

### 4. Database: PostgreSQL + Prisma ORM

**Decision**: Use PostgreSQL 15+ with Prisma 5+ for schema and queries.

**Rationale**:
- **PostgreSQL**: Mature, reliable, excellent JSON support (for future features), ACID compliance, free/open-source
- **Prisma**: Type-safe query builder, schema-as-code (version controlled), automatic migrations, great DX
- **TypeScript Integration**: Generated types match schema exactly, compile-time safety
- **Developer Experience**: Prisma Studio for visual DB browsing, simple migration workflow

**Alternatives Evaluated**:
- **Drizzle ORM**: Newer, lighter, but less mature, fewer resources, smaller community
- **TypeORM**: Heavy, complex decorators, less intuitive than Prisma's schema DSL
- **Raw SQL**: No type safety, manual migration management, SQL injection risks without prepared statements

**Best Practices**:
- Define schema in `schema.prisma` as single source of truth
- Use `@@index` for foreign keys and frequently queried columns (userId, asin, createdAt)
- Use transactions for multi-table operations (import process: delete + insert)
- Generate Prisma Client after schema changes: `pnpm prisma generate`
- Use Prisma Client singleton pattern (Next.js hot reload causes connection pool issues)
- Name migrations descriptively: `pnpm prisma migrate dev --name add-sync-token-table`

**Implementation Notes**:
- Database runs in Docker container (configured in `packages/db/docker-compose.yml`)
- Connection string in `.env`: `DATABASE_URL="postgresql://user:pass@localhost:5432/audible_lists"`
- Prisma Client imported from singleton: `import { prisma } from '@/lib/prisma'`
- Use `prisma.$transaction()` for import process to ensure atomicity

---

### 5. Styling: Tailwind CSS + shadcn/ui

**Decision**: Use Tailwind CSS v3 for styling and shadcn/ui for component primitives.

**Rationale**:
- **Tailwind CSS**: Utility-first, no runtime cost, excellent DX with IntelliSense, consistent design system
- **shadcn/ui**: Accessible components (based on Radix UI), copy-paste (no npm dependency), fully customizable, TypeScript support
- **Integration**: shadcn/ui uses Tailwind classes, seamless integration

**Alternatives Evaluated**:
- **CSS Modules**: More boilerplate, harder to maintain consistency, no utility classes
- **styled-components**: Runtime cost (CSS-in-JS), Flash of Unstyled Content (FOUC), harder server-side rendering
- **Material-UI**: Heavy bundle size, opinionated design (hard to customize), less flexible

**Best Practices**:
- Configure Tailwind in `tailwind.config.ts` (colors, spacing, fonts)
- Use shadcn/ui CLI to add components: `npx shadcn-ui@latest add button`
- Customize shadcn/ui components in `components/ui/` after installation
- Avoid inline styles outside Tailwind classes (maintain consistency)
- Use Tailwind's responsive modifiers: `md:`, `lg:`, `xl:`
- Use CSS variables for theme colors (shadcn/ui sets these up)

**Implementation Notes**:
- Install shadcn/ui base: `npx shadcn-ui@latest init`
- Add components as needed: Button, Input, Dialog, Card, Badge, Table, Search
- Global styles in `app/globals.css`
- Dark mode ready (shadcn/ui includes theme provider)

---

### 6. Browser Extension: Chrome Manifest V3 + Plain JavaScript

**Decision**: Build Chrome-only extension with Manifest V3, using plain JavaScript (no build step).

**Rationale**:
- **Manifest V3**: Required for new Chrome extensions (V2 deprecated 2024)
- **Plain JavaScript**: Avoids build complexity, faster iteration, simpler debugging, works for small extension
- **Chrome-Only**: MVP targets Chrome users, Chromium browsers (Edge, Brave) work as bonus

**Alternatives Evaluated**:
- **TypeScript + Build Step**: Adds complexity (webpack/rollup config), slower development, unnecessary for ~500 lines of code
- **WebExtension Polyfill**: For cross-browser support (Firefox, Safari), deferred to post-MVP
- **Plasmo/WXT Frameworks**: Over-engineered for simple scraping extension

**Best Practices**:
- Use JSDoc comments for type hints: `/** @type {string} */`
- Reference `@audible-lists/shared` types in comments (not imported): `/** @typedef {import('@audible-lists/shared').SyncPayload} SyncPayload */`
- Modularize logic: separate files for scraping, throttling, upload
- Use `chrome.storage.local` for persistent state (sync token, connection status)
- Handle service worker lifecycle (Manifest V3 uses service workers, not background pages)
- Test with "Load unpacked" in Chrome developer mode

**Implementation Notes**:
- `manifest.json` declares permissions: `storage`, `tabs`, host permission for `audible.com`
- `background.js` (service worker) detects token in URL, stores it
- `content.js` injected into Audible pages, handles scraping
- `popup/popup.html` provides extension UI (Start Sync button, progress, status)

---

### 7. Sync Token: JWT (HS256, 15min TTL)

**Decision**: Use signed JWTs for sync tokens with server secret, 15-minute expiry, single-use enforcement.

**Rationale**:
- **Self-Contained**: Token includes user ID and scope, no database lookup needed during validation
- **Tamper-Proof**: HMAC signature (HS256) prevents token modification
- **Standard Format**: JWT is widely supported, mature libraries available
- **Expiry Built-In**: `exp` claim enforced by JWT library
- **Revocable**: Track JWT ID (`jti`) in database, mark as used after first upload

**Alternatives Evaluated**:
- **Random Tokens**: Require database lookup on every validation (slower), simpler implementation
- **API Keys**: Long-lived, not suitable for short-term single-use tokens
- **Session Cookies**: Wrong use case (extension can't share browser session)

**Best Practices**:
- Sign with HS256 (symmetric): `jwt.sign(payload, SECRET, { algorithm: 'HS256' })`
- Include claims: `{ sub: userId, jti: uuidv4(), scope: 'sync:upload', exp: Date.now() + 15*60*1000 }`
- Store `jti` in SyncToken table, check `used` flag before accepting payload
- Mark token as used atomically: `UPDATE SyncToken SET used=true WHERE jti=? AND used=false`
- Generate new token invalidates previous (optional: mark old tokens as expired)
- Use environment variable for secret: `JWT_SECRET` (never commit)

**Implementation Notes**:
- Library: `jsonwebtoken` (most popular, battle-tested)
- Generate token in `app/api/sync/token/route.ts`
- Validate token in `app/api/sync/import/route.ts` before processing payload
- Extension includes token in Authorization header: `Authorization: Bearer <jwt>`

---

### 8. Import Strategy: Full Replace (MVP)

**Decision**: On re-sync, delete all user's library entries and re-import from payload.

**Rationale**:
- **Simplicity**: No diffing logic, no change detection, straightforward implementation
- **Accuracy**: Guarantees perfect sync (no stale data, no orphaned entries)
- **MVP Appropriate**: Performance acceptable for typical library size (200-300 titles)
- **Transactional Safety**: Wrapped in database transaction, all-or-nothing

**Alternatives Evaluated**:
- **Incremental Updates**: Compare existing vs. new, update changed, remove missing. Complex, error-prone, unnecessary for MVP.
- **Soft Deletes**: Mark entries as deleted instead of removing. Preserves history but complicates queries, adds `WHERE deleted=false` everywhere.
- **Append-Only**: Never delete, always add new entries. Causes duplicates, requires complex deduplication.

**Best Practices**:
- Wrap in Prisma transaction: `prisma.$transaction(async (tx) => { ... })`
- Delete first: `tx.userLibrary.deleteMany({ where: { userId } })`
- Then insert: `tx.userLibrary.createMany({ data: entries })`
- Log counts in SyncHistory: titles synced, new to catalog, removed from library
- If transaction fails (network error, validation error), rollback automatically

**Implementation Notes**:
- Import process in `app/api/sync/import/route.ts`
- For each title in payload:
  - Upsert TitleCatalog (insert if new ASIN, update if changed metadata)
  - Collect UserLibrary entry data
- After processing all titles, create all UserLibrary entries in single `createMany` call
- Return summary response: `{ success: true, imported: 245, newToCatalog: 12, warnings: [] }`

---

## Deferred Decisions (Post-MVP)

**Testing Framework**: Not selected for MVP. Architecture supports future testing:
- API routes separated from business logic (easy to unit test)
- Prisma client can be mocked or use test database
- Likely choice: Vitest (fast, Vite-based, good TypeScript support) + React Testing Library

**Multi-Region Support**: Deferred. When adding:
- Add `region` column to TitleCatalog (enum: 'us', 'uk', 'ca', 'au', etc.)
- Change ASIN uniqueness constraint to composite: `@@unique([asin, region])`
- Extension detects region from Audible domain (audible.com vs audible.co.uk)
- Pass region in sync payload

**Additional OAuth Providers**: Deferred. NextAuth supports multiple providers:
- Add providers in `lib/auth.ts`: `providers: [GoogleProvider(...), GithubProvider(...)]`
- Database schema already supports multiple accounts per user (NextAuth adapter)

**Recommendation Lists / Tier Lists**: Schema designed to support, implementation deferred:
- RecommendationList table exists (empty in MVP)
- TierList table exists (empty in MVP)
- Join tables (ListItem, TierAssignment) exist but unused
- Add UI and API routes in future phase

---

## Risk Assessment

**Low Risk**:
- All technologies are mature and production-proven
- Strong TypeScript support across stack reduces bugs
- Constitutional principles fully satisfied (no violations)

**Medium Risk**:
- Audible DOM structure may change (breaks scraping). Mitigation: Use multiple selectors, fallback to JSON-LD when available.
- Rate limiting by Audible. Mitigation: Conservative throttling (5 concurrent, 500ms delay), exponential backoff, clear user messaging.

**High Risk**: None identified

---

## Conclusion

Technology stack is well-suited for MVP. All choices are mature, well-documented, and aligned with constitutional principles. Monorepo structure provides clean package boundaries. Next.js unified architecture simplifies deployment. Prisma ensures type-safe database access. Extension's plain JS approach avoids unnecessary build complexity. JWT-based sync tokens provide secure, stateless authentication for extension uploads.

**Ready to proceed to Phase 1 (Design)**.
