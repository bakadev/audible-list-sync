# Implementation Plan: User Lists (Recommendations + Tier Lists)

**Branch**: `006-user-lists` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-user-lists/spec.md`

## Summary

Add user-created lists (Recommendation Lists and Tier Lists) to audioshlf. Users curate ordered or tiered collections from their library, which are publicly viewable at `/[username]/lists/[listId]`. Requires adding a username field to User, new List/ListItem data models in PostgreSQL, drag-and-drop editing UI, and public profile routes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), JavaScript ES2020
**Primary Dependencies**: Next.js 16 (App Router), React 19, Prisma 6, TailwindCSS 4, shadcn/ui, @dnd-kit/core + @dnd-kit/sortable (drag-and-drop)
**Storage**: PostgreSQL 14+ (via Docker Compose), Audnexus API (book metadata)
**Testing**: Manual + E2E (no test framework mandated by constitution)
**Target Platform**: Web (Chrome, Firefox, Safari, mobile browsers)
**Project Type**: Web application (monorepo, `packages/ui`)
**Performance Goals**: List page load < 2s for 100 items, drag-and-drop at 60fps
**Constraints**: Max 100 items per list, max 10 tiers per tier list
**Scale/Scope**: Hundreds of users, each with 0-50 lists

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security & Privacy First | ✅ PASS | No credentials handled. Lists are user-created content with owner-only edit via session auth. Public endpoints are read-only. Username validation prevents reserved slug conflicts. |
| II. Package-Based Architecture | ✅ PASS | All changes contained within `packages/ui` (web app). No cross-package dependencies added. New dnd-kit dependency is UI-only. |
| III. Data Normalization | ✅ PASS | ListItem stores `titleAsin` reference only. Book metadata served by Audnexus API on demand via batch-fetch. No title data duplication in List/ListItem tables. |
| IV. Responsible External Integration | ✅ PASS | Batch-fetch metadata from local Audnexus for list items (max 100 per list). Existing retry/backoff logic in `audnex.ts` applies. |
| V. User Control & Transparency | ⚠️ PASS (deferred) | Users control list creation/editing/deletion. **Deviation**: Constitution requires configurable visibility (public/unlisted/friends-only) but this feature ships all-public per requirements. Visibility toggle deferred to P3 (see research.md R5). Acceptable because the feature is explicitly designed for public sharing. |

**Post-Design Review** (2026-02-21): All principles pass. One deferred compliance item documented in Complexity Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/006-user-lists/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technology research
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: getting started guide
└── contracts/           # Phase 1: API contracts
    └── api.md
```

### Source Code (repository root)

```text
packages/ui/
├── prisma/
│   └── schema.prisma              # Add List, ListItem models + username on User
├── src/
│   ├── app/
│   │   ├── (authenticated)/
│   │   │   ├── lists/
│   │   │   │   ├── page.tsx           # Manage lists view
│   │   │   │   ├── new/page.tsx       # Create list form
│   │   │   │   └── [listId]/
│   │   │   │       └── edit/page.tsx  # Edit list (drag-and-drop editor)
│   │   │   └── settings/page.tsx      # Add username setting
│   │   ├── [username]/
│   │   │   ├── page.tsx               # Public profile
│   │   │   └── lists/
│   │   │       └── [listId]/page.tsx  # Public list view
│   │   └── api/
│   │       ├── lists/
│   │       │   ├── route.ts           # GET (my lists), POST (create)
│   │       │   └── [listId]/
│   │       │       ├── route.ts       # GET, PUT, DELETE
│   │       │       └── items/
│   │       │           └── route.ts   # PUT (bulk update items)
│   │       └── users/
│   │           └── [username]/
│   │               └── lists/
│   │                   └── route.ts   # GET (public lists for user)
│   ├── components/
│   │   └── lists/
│   │       ├── list-editor.tsx        # Drag-and-drop editor (recommendation)
│   │       ├── tier-list-editor.tsx   # Drag-and-drop tier editor
│   │       ├── list-card.tsx          # List card for manage view
│   │       ├── list-title-picker.tsx  # Library search + add to list
│   │       ├── public-list-view.tsx   # Public list renderer
│   │       └── public-tier-view.tsx   # Public tier list renderer
│   └── lib/
│       └── audnex.ts                 # Existing - used for metadata fetching
```

**Structure Decision**: All code lives in `packages/ui` following the existing monorepo convention. Public routes use a new `[username]` dynamic segment at the app root level (outside the `(authenticated)` group) for unauthenticated access.

## Complexity Tracking

### CT-001: List Visibility (Principle V — Deferred)

**Principle violated**: V. User Control & Transparency — "Every list, library, and profile MUST have configurable visibility (public, unlisted, friends-only)"

**What**: All lists are public by default with no visibility toggle in v1.

**Why**: The feature requirements explicitly state lists are "intended to be shareable via a public URL and viewable by other users." Adding a visibility enum (PUBLIC/PRIVATE/UNLISTED) adds data model complexity, UI for the toggle, and middleware for access checks — none of which were requested.

**Simpler alternatives considered**: None needed. The current design is the simpler path. Full visibility support is additive (adding a `visibility` column to List and a middleware guard) and can be layered on without breaking changes.

**Resolution**: Deferred to P3 scope. When implemented, add `visibility ListVisibility @default(PUBLIC)` to the List model and update public API endpoints to filter by visibility.
