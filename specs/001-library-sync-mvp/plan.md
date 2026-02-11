# Implementation Plan: Audible Library Sync MVP

**Branch**: `001-library-sync-mvp` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-library-sync-mvp/spec.md`

## Summary

The Audible Library Sync MVP enables users to authenticate via Google OAuth, connect a Chrome extension to their account, sync their Audible library (US region) through local browser scraping, and browse their synced collection on the website. The platform uses a monorepo architecture with four packages (ui, extension, db, shared) coordinated by Turborepo. Extension scrapes library data locally, uploads via short-lived JWT, and the website processes imports into a normalized database (shared title catalog + user-specific library entries). Users can search their library and view sync history on a dashboard.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) for ui/shared packages, JavaScript ES2020 for extension
**Primary Dependencies**: Next.js 14+ (App Router), Auth.js (NextAuth), Prisma 5+, Tailwind CSS, shadcn/ui
**Storage**: PostgreSQL 15+ (via Prisma ORM)
**Testing**: Deferred for MVP (architecture supports future testing with clean separation)
**Target Platform**: Self-hosted Linux/Docker, Chrome browser (Manifest V3 extension)
**Project Type**: Monorepo web application (frontend + backend unified in Next.js, plus extension)
**Performance Goals**: OAuth <30s, sync 200 titles <5min, search <500ms, support 1000 titles
**Constraints**: Extension US region only, Google OAuth only, no background sync, full-replace import strategy
**Scale/Scope**: MVP targets power users (100+ titles), architecture supports thousands of users with shared catalog

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Security & Privacy First (NON-NEGOTIABLE) ✅

**Compliance**:
- ✅ Extension scrapes locally in user's browser session, never collects credentials
- ✅ Sync tokens are JWT with 15min TTL, signed, single-use (tracked in database)
- ✅ Token passed via URL fragment, validated on server before accepting payload
- ✅ User libraries private by default (MVP has no sharing features)
- ✅ No Audible credentials, session cookies, or auth tokens transmitted to platform

**Risk Assessment**: **PASS** - Architecture fully complies. JWT flow prevents token reuse. Extension runs in isolated context.

### II. Package-Based Architecture ✅

**Compliance**:
- ✅ Four packages: `ui` (Next.js), `extension` (Chrome), `db` (Prisma schema), `shared` (TypeScript types)
- ✅ Each package has PURPOSE.md (to be created during setup)
- ✅ Clear interfaces: HTTP API (ui ↔ extension), Prisma client (ui ↔ db), TypeScript types (shared → ui/extension)
- ✅ No circular dependencies: shared is leaf package, db exports schema only, ui imports shared, extension references shared informally

**Risk Assessment**: **PASS** - Clean package boundaries. Extension uses plain JS to avoid build complexity, references shared types as documentation only.

### III. Data Normalization & Efficiency ✅

**Compliance**:
- ✅ TitleCatalog table (keyed by ASIN) stores shared metadata
- ✅ UserLibrary join table stores only references + personal metadata (progress, rating, source)
- ✅ Import logic checks ASIN existence before insert, reuses catalog entries
- ✅ Future lists (deferred) will reference UserLibrary, which references TitleCatalog

**Risk Assessment**: **PASS** - Normalized schema prevents duplication. Import strategy adds new titles to catalog or skips if exists.

### IV. Responsible External System Integration ✅

**Compliance**:
- ✅ Extension throttles Audible requests (max 5 concurrent, 500ms batch delay per spec FR-014)
- ✅ Exponential backoff on errors (1s, 2s, 4s delays, max 3 retries per spec FR-015)
- ✅ Real-time progress display during scraping (current item, total items per spec FR-012)
- ✅ Explicit user action required to start sync (no background operation per spec FR-011)
- ✅ Graceful error messages on rate limiting or network failure

**Risk Assessment**: **PASS** - Rate limiting and backoff prevent abuse. User controls all scraping actions.

### V. User Control & Transparency ✅

**Compliance**:
- ✅ Libraries private in MVP (visibility controls deferred)
- ✅ Extension shows real-time sync progress
- ✅ Dashboard displays sync history, timestamps, item counts, warnings (per spec FR-028)
- ✅ Error messages are actionable (display server validation errors per spec acceptance scenarios)
- ✅ User can disconnect extension (generate new token invalidates old per spec)

**Risk Assessment**: **PASS** - Full transparency. Users control sync timing. Dashboard provides audit trail.

**Gate Decision**: ✅ **APPROVED TO PROCEED** - All constitutional principles satisfied with no violations or exceptions needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-library-sync-mvp/
├── plan.md              # This file
├── research.md          # Phase 0: Technology rationale
├── data-model.md        # Phase 1: Database schema
├── quickstart.md        # Phase 1: Developer setup guide
└── contracts/           # Phase 1: API contracts
    ├── auth.yaml        # OAuth flow
    ├── sync.yaml        # Token generation + import endpoint
    └── library.yaml     # Library query endpoints
```

### Source Code (repository root)

```text
# Monorepo structure (Turborepo + pnpm workspaces)
packages/
├── ui/                  # Next.js full-stack application
│   ├── src/
│   │   ├── app/         # Next.js App Router pages
│   │   │   ├── (auth)/  # Auth pages (login, callback)
│   │   │   ├── dashboard/
│   │   │   ├── library/
│   │   │   └── api/     # API routes
│   │   │       ├── auth/[...nextauth]/  # NextAuth
│   │   │       ├── sync/
│   │   │       │   ├── token/           # Generate sync token
│   │   │       │   └── import/          # Accept extension payload
│   │   │       └── library/             # Query library
│   │   ├── components/  # React components
│   │   │   ├── ui/      # shadcn/ui components
│   │   │   ├── dashboard/
│   │   │   └── library/
│   │   ├── lib/         # Utilities
│   │   │   ├── prisma.ts    # Prisma client singleton
│   │   │   ├── auth.ts      # NextAuth config
│   │   │   └── jwt.ts       # JWT signing/validation
│   │   └── types/       # UI-specific types
│   ├── prisma/          # Symlink to ../db/prisma
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── PURPOSE.md
│
├── extension/           # Chrome extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js    # Service worker (minimal, token detection)
│   ├── content.js       # Content script (scraping logic)
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js     # Extension UI
│   ├── utils/
│   │   ├── scraper.js   # Audible DOM parsing
│   │   ├── throttle.js  # Rate limiting
│   │   └── upload.js    # POST to import endpoint
│   ├── package.json     # Minimal, no build step
│   └── PURPOSE.md
│
├── db/                  # Database configuration
│   ├── prisma/
│   │   ├── schema.prisma    # Schema definition
│   │   └── migrations/      # Prisma migrations
│   ├── docker-compose.yml   # PostgreSQL container
│   ├── .env.example         # DB connection template
│   ├── package.json         # Prisma CLI scripts
│   └── PURPOSE.md
│
└── shared/              # Shared TypeScript types
    ├── src/
    │   ├── sync.ts      # Sync payload schema
    │   ├── api.ts       # API request/response types
    │   └── entities.ts  # Domain entities (User, Title, etc.)
    ├── package.json
    ├── tsconfig.json
    └── PURPOSE.md

# Root configuration
turbo.json               # Turborepo pipeline
pnpm-workspace.yaml      # pnpm workspace config
package.json             # Root package (workspace scripts)
.env                     # Root secrets (never committed)
.env.example             # Template for required env vars
docker-compose.yml       # Full stack (Postgres + Next dev server)
README.md
```

**Structure Decision**: Monorepo web application structure. Next.js unifies frontend/backend (no separate backend package). Extension is standalone plain JS. Database package exports Prisma schema. Shared package provides type safety across ui/extension (extension references types as documentation only since it's plain JS).

## Complexity Tracking

**No violations** - The four-package structure complies with constitutional Package-Based Architecture principle. The constitution originally mentioned three core packages (extension, ui, db) but explicitly allows for shared packages in the requirement: "Shared code MUST be extracted to a separate shared package, NOT duplicated across packages." The `shared` package fulfills this requirement by preventing type duplication between ui and extension.

## Phase 0: Research (Minimal - Technologies Pre-Selected)

All technology choices were specified in the requirements. Research focused on validating selected technologies and identifying best practices.

### Key Decisions

**Decision 1: Turborepo + pnpm workspaces**
- **Rationale**: Turborepo provides fast, cached builds for monorepo. pnpm efficient with disk space, fast installs, strict dependency resolution prevents phantom dependencies.
- **Alternatives considered**: Nx (more complex, unnecessary features), Lerna (legacy, slower), Yarn workspaces (less efficient than pnpm)
- **Best practices**: Use Turborepo for build orchestration, pnpm for package management, define clear task dependencies in turbo.json

**Decision 2: Next.js App Router (unified frontend + backend)**
- **Rationale**: Next.js 14+ App Router provides Server Components, built-in API routes, excellent TypeScript support, simplified deployment (single artifact). Eliminates need for separate backend package.
- **Alternatives considered**: Separate React frontend + Express backend (more complex deployment, code duplication), Remix (less mature ecosystem)
- **Best practices**: Use Server Actions for mutations, API routes for extension integration, Server Components for data fetching, Route Handlers for REST API

**Decision 3: Auth.js (NextAuth) for Google OAuth**
- **Rationale**: NextAuth is battle-tested, has first-class Next.js integration, handles OAuth flows securely, manages sessions.
- **Alternatives considered**: Passport.js (Express-focused, harder in Next.js), Lucia (newer, less documentation), manual OAuth (error-prone)
- **Best practices**: Use database session strategy (required for user management), JWT for API authentication (separate from session), store Google user ID as unique identifier

**Decision 4: Prisma ORM**
- **Rationale**: Type-safe queries (no SQL injection), schema-as-code (version controlled), automatic migrations, excellent TypeScript integration.
- **Alternatives considered**: Drizzle (newer, less mature), TypeORM (heavier, more complex), raw SQL (no type safety)
- **Best practices**: Define schema in single source of truth, use transactions for multi-table operations (import process), index foreign keys and frequently queried columns

**Decision 5: Tailwind CSS + shadcn/ui**
- **Rationale**: Tailwind provides utility-first styling with no runtime, shadcn/ui provides accessible components (no npm dependency, copy-paste), good TypeScript support.
- **Alternatives considered**: CSS Modules (more boilerplate), styled-components (runtime cost), Material-UI (heavy, opinionated)
- **Best practices**: Use shadcn/ui for base components (Button, Input, Dialog), customize via Tailwind config, avoid inline styles outside Tailwind classes

**Decision 6: Chrome Manifest V3, Plain JavaScript**
- **Rationale**: Manifest V3 required for new extensions (V2 deprecated). Plain JS avoids build complexity, faster development iteration.
- **Alternatives considered**: TypeScript with build step (adds complexity for small extension), WebExtension Polyfill (unnecessary for Chrome-only)
- **Best practices**: Use JSDoc comments for type hints (reference shared types), modularize scraping logic, use chrome.storage.local for token persistence

**Decision 7: JWT for Sync Tokens**
- **Rationale**: Self-contained (no database lookup during validation), signed (tamper-proof), standard format, expiry built-in, stateless.
- **Alternatives considered**: Random tokens (require database lookup), API keys (long-lived), session cookies (wrong use case for extension ↔ API)
- **Best practices**: Sign with HS256 + secret, include user ID and scope in claims, set short TTL (15min), track "jti" (JWT ID) in database for revocation

**Decision 8: Full Replace Import Strategy (MVP)**
- **Rationale**: Simplest implementation for MVP. Avoids complex diffing logic. Guarantees sync accuracy (no stale data).
- **Alternatives considered**: Incremental updates (complex, needs change detection), soft deletes (preserves history but complicates queries)
- **Best practices**: Wrap in transaction, delete old UserLibrary entries first (preserves foreign key integrity), log counts in SyncHistory for audit trail

See [research.md](./research.md) for detailed analysis.

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](./data-model.md) for complete schema with relationships and validation rules.

**Key Entities**:
- **User**: Google OAuth identity, session data
- **SyncToken**: JWT tracking for revocation, single-use enforcement
- **TitleCatalog**: Shared audiobook metadata (keyed by ASIN)
- **UserLibrary**: User-specific library entries (references TitleCatalog)
- **SyncHistory**: Audit trail of sync operations
- **RecommendationList** (deferred): Future recommendation lists
- **TierList** (deferred): Future tier rankings

### API Contracts

See [contracts/](./contracts/) directory for OpenAPI specifications.

**Endpoints**:
- `POST /api/auth/[...nextauth]` - NextAuth OAuth flow (handled by Auth.js)
- `POST /api/sync/token` - Generate sync token (authenticated)
- `POST /api/sync/import` - Accept extension payload (JWT authenticated)
- `GET /api/library` - Query user library (authenticated, supports search)
- `GET /api/sync/history` - Fetch sync history (authenticated)

### Developer Quickstart

See [quickstart.md](./quickstart.md) for complete setup instructions.

**Setup Summary**:
1. Clone repo, install pnpm
2. `pnpm install` (installs all workspace packages)
3. Copy `.env.example` to `.env`, fill in secrets (Google OAuth, JWT secret, database URL)
4. `pnpm --filter db docker:up` (start PostgreSQL)
5. `pnpm --filter db prisma:migrate` (run migrations)
6. `pnpm --filter ui dev` (start Next.js on localhost:3000)
7. Load extension in Chrome (developer mode, load unpacked from `packages/extension/`)

## Implementation Notes

### Import Endpoint Flow

1. **Authentication**: Verify JWT in `Authorization` header (signature, expiry, user ID)
2. **Token Check**: Query SyncToken table by JWT ID (`jti` claim), verify not already used, mark as used
3. **Validation**: Check payload structure (required fields, types, size <50MB)
4. **Transaction Start**: Begin Prisma transaction
5. **Delete Old Entries**: `DELETE FROM UserLibrary WHERE userId = ?`
6. **Process Titles**: For each title in payload:
   - Check if ASIN exists in TitleCatalog (`findUnique`)
   - If not, `INSERT INTO TitleCatalog` with scraped metadata
   - `INSERT INTO UserLibrary` with user ID, title reference, personal metadata
7. **Log Sync**: `INSERT INTO SyncHistory` with counts and warnings
8. **Transaction Commit**: Commit or rollback on error
9. **Response**: Return summary (titles added, new to catalog, warnings)

### Extension Scraping Flow

1. **Token Detection**: Background script listens for audible.com URL with token in fragment (`#token=...`)
2. **Token Storage**: Store token in `chrome.storage.local`, show "Connected" badge
3. **User Initiates Sync**: User clicks "Start Sync" in extension popup
4. **Library Scraping**: Content script fetches library pages, parses DOM for title cards, extracts store URLs
5. **Store Page Fetching**: For each title, fetch store page, extract rich metadata from JSON-LD or DOM fallback
6. **Rate Limiting**: Max 5 concurrent fetches, 500ms delay between batches
7. **Progress Updates**: Send progress to popup (`chrome.runtime.sendMessage`), update UI
8. **Payload Assembly**: Build JSON array of title objects with user metadata
9. **Upload**: POST to `/api/sync/import` with JWT in `Authorization: Bearer <token>`
10. **Result Display**: Show success with counts or error message

### Session Management

- **NextAuth Session**: Database session strategy, 30-day expiry, stored in Session table
- **JWT for Extension**: Separate from NextAuth session, short-lived (15min), single-use, no refresh token
- **Token Invalidation**: Generate new token invalidates previous (updates SyncToken `used` flag if needed)

### Future-Proofing

**Schema includes deferred tables** (empty in MVP, ready for future phases):
- `RecommendationList`: User-created themed lists
- `ListItem`: Join table linking lists to UserLibrary entries
- `TierList`: User-created tier rankings
- `TierAssignment`: Join table linking tier lists to UserLibrary entries with tier level

**Visibility controls**: Add `visibility` enum column to User/List tables in future migration (public/unlisted/friends)

**Multi-region support**: Add `region` column to TitleCatalog (defaults to 'us'), update ASIN uniqueness constraint to include region

**Additional OAuth providers**: NextAuth supports multiple providers, add configuration in `lib/auth.ts` when needed
