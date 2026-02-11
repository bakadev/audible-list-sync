# Implementation Plan: Admin Dashboard & Data Import

**Branch**: `004-admin-dashboard` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-admin-dashboard/spec.md`

## Summary

This feature adds an admin dashboard for managing users and titles, plus a data import endpoint that ingests extension JSON and enriches titles via Audnex API. Core technical approach:

1. **Extend database schema** with admin role flag on User model and relationships to support the title catalog architecture
2. **Create import API endpoint** that processes extension JSON, checks for existing titles, and fetches missing metadata from Audnex API (https://api.audnex.us/books/{asin})
3. **Build admin UI pages** (Users list, User detail, Titles list, Title detail) with role-based access control
4. **Add destructive operations** (drop user library, drop all titles) for development/testing

The import endpoint is the critical path - it establishes the data flow from extension → platform and populates the title catalog that all other features depend on.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 19, React 19)
**Primary Dependencies**: Next.js 19, React 19, Prisma ORM, NextAuth, TailwindCSS, shadcn/ui
**Storage**: PostgreSQL 14+ (via Docker Compose)
**Testing**: Manual testing via quickstart scenarios (no automated tests requested in spec)
**Target Platform**: Web application (SSR + client-side components)
**Project Type**: Monorepo web application (packages/ui + packages/extension)
**Performance Goals**: <30s import for 100+ titles (excluding Audnex API time), <2s dashboard load
**Constraints**: Audnex API rate limits (unknown, will use graceful degradation), PostgreSQL connection limits
**Scale/Scope**: Single admin user initially, 100+ titles per user, 10+ users for testing phase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Security & Privacy First ✅ PASS

**Assessment**: Feature maintains the "no credentials" principle. Admin access uses existing NextAuth session. Import endpoint receives already-scraped data (not credentials). Audnex API is read-only metadata fetch (no authentication required).

**Compliance**:
- ✅ No credentials requested or stored (uses existing NextAuth)
- ✅ Import endpoint is POST-only, requires authentication
- ✅ Admin role check prevents unauthorized access
- ✅ No Amazon/Audible credentials touched

### II. Package-Based Architecture ✅ PASS

**Assessment**: Feature operates entirely within `packages/ui` package. No cross-package violations. Extension package already produces the JSON that the import endpoint consumes.

**Compliance**:
- ✅ All changes confined to packages/ui (admin pages, import API)
- ✅ Well-defined interface: extension outputs JSON, API imports it
- ✅ No circular dependencies introduced
- ✅ Database schema is shared via Prisma (appropriate shared layer)

### III. Data Normalization & Efficiency ✅ PASS

**Assessment**: Feature implements the title catalog architecture. Titles table stores shared metadata (from Audnex API). LibraryEntry stores user-specific data (ratings, progress). This is exactly the normalized design the constitution mandates.

**Compliance**:
- ✅ Single source of truth: Title catalog with shared metadata
- ✅ User libraries store references (foreign keys) + user-specific data only
- ✅ Import checks for existing titles before fetching from Audnex API
- ✅ Avoids metadata duplication across users

### IV. Responsible External System Integration ✅ PASS

**Assessment**: Audnex API integration is read-only and includes error handling. Import continues processing remaining titles if one API call fails. No aggressive polling or background fetching.

**Compliance**:
- ✅ Audnex API calls are user-initiated (via import)
- ✅ Error handling with graceful degradation (log & continue)
- ✅ No background scraping or automated refreshes
- ✅ Rate limiting responsibility delegated to Audnex API (they control it)

**Note**: Audnex API rate limits are unknown. Will implement retry with exponential backoff and clear error messaging if rate-limited.

### V. User Control & Transparency ✅ PASS

**Assessment**: Import is user-initiated. Admin operations are explicit actions with clear outcomes. Destructive operations (drop library, drop titles) are admin-only and intended for dev/test environments.

**Compliance**:
- ✅ Import is user-initiated (not automatic)
- ✅ Clear error messages when Audnex API fails
- ✅ Admin access is role-gated
- ✅ Destructive operations are explicit user actions

**Production Safeguard Note**: Production deployment should add confirmation dialogs for destructive operations and consider soft deletes instead of hard deletes.

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-dashboard/
├── plan.md              # This file
├── research.md          # Audnex API patterns, Prisma many-to-many best practices
├── data-model.md        # Extended schema with admin role, title catalog, relations
├── quickstart.md        # Test scenarios for import endpoint and admin pages
├── contracts/           # OpenAPI specs for import endpoint and admin APIs
│   ├── import.yaml      # POST /api/admin/import
│   ├── admin-users.yaml # GET /api/admin/users, GET /api/admin/users/:id, DELETE
│   └── admin-titles.yaml # GET /api/admin/titles, GET /api/admin/titles/:asin, PUT, DELETE
└── tasks.md             # (Generated by /speckit.tasks command)
```

### Source Code (packages/ui)

```text
packages/ui/
├── prisma/
│   └── schema.prisma                      # Add admin role, extend Title/Author/Narrator models
├── src/
│   ├── app/
│   │   └── (authenticated)/
│   │       └── admin/                     # NEW: Admin dashboard routes
│   │           ├── layout.tsx             # Admin auth guard, nav
│   │           ├── page.tsx               # Admin dashboard home
│   │           ├── users/
│   │           │   ├── page.tsx           # Users list
│   │           │   └── [userId]/
│   │           │       └── page.tsx       # User detail + library management
│   │           └── titles/
│   │               ├── page.tsx           # Titles list
│   │               └── [asin]/
│   │                   └── page.tsx       # Title detail + metadata edit
│   ├── api/
│   │   └── admin/
│   │       ├── import/
│   │       │   └── route.ts               # NEW: POST import endpoint
│   │       ├── users/
│   │       │   ├── route.ts               # GET all users
│   │       │   └── [userId]/
│   │       │       ├── route.ts           # GET user details
│   │       │       └── library/
│   │       │           └── route.ts       # DELETE user library
│   │       └── titles/
│   │           ├── route.ts               # GET all titles, DELETE all titles
│   │           └── [asin]/
│   │               ├── route.ts           # GET title, PUT title
│   │               └── refresh/
│   │                   └── route.ts       # POST refresh from Audnex
│   ├── components/
│   │   └── admin/                         # NEW: Admin-specific components
│   │       ├── users-table.tsx
│   │       ├── user-library-table.tsx
│   │       ├── titles-table.tsx
│   │       ├── title-edit-form.tsx
│   │       └── danger-zone.tsx            # Drop operations with confirmation
│   ├── lib/
│   │   ├── audnex.ts                      # NEW: Audnex API client
│   │   └── admin-auth.ts                  # NEW: Admin role checking utilities
│   └── middleware.ts                      # UPDATE: Add admin route protection
```

**Structure Decision**: This feature extends the existing `packages/ui` Next.js application with new admin routes and API endpoints. All admin functionality is namespaced under `/admin` routes and `/api/admin` API routes to maintain clear separation from user-facing features. The Prisma schema extension follows the existing pattern of models + relations.

## Complexity Tracking

> **No constitutional violations** - This feature aligns with all principles and introduces no new complexity requiring justification.

## Phase 0: Research

### R1: Audnex API Integration Patterns

**Decision**: Use fetch with error handling and exponential backoff. Cache results in Title table to avoid redundant API calls.

**Rationale**:
- Audnex API is publicly accessible, no auth required
- Response format is stable (JSON with predictable schema)
- Network failures are expected, need graceful degradation
- Caching in Title table means we only fetch each ASIN once

**Implementation**:
```typescript
// lib/audnex.ts
async function fetchTitleMetadata(asin: string, retries = 3): Promise<AudnexTitle | null> {
  try {
    const response = await fetch(`https://api.audnex.us/books/${asin}`)
    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        // Retry with exponential backoff for rate limits and server errors
        if (retries > 0) {
          await sleep(Math.pow(2, 3 - retries) * 1000)
          return fetchTitleMetadata(asin, retries - 1)
        }
      }
      return null // Non-retryable error, skip this title
    }
    return await response.json()
  } catch (error) {
    console.error(`Audnex API error for ${asin}:`, error)
    return null
  }
}
```

**Alternatives considered**:
- **axios**: Rejected, adds dependency when fetch is sufficient
- **Sync all titles on schedule**: Rejected, violates "no background scraping" principle
- **Bulk API calls**: Audnex API doesn't support bulk lookups

### R2: Prisma Many-to-Many Relationships

**Decision**: Use explicit join tables for Author-Title and Narrator-Title relationships. Use implicit relation for Genre-Title (Prisma `@relation` on arrays).

**Rationale**:
- Author and Narrator have additional metadata (ASIN, name) requiring explicit models
- Genre is simpler (just ASIN + name), implicit relation is cleaner
- Explicit join tables give more control over query performance
- Follows Prisma best practices for complex relations

**Schema additions**:
```prisma
model Title {
  asin         String   @id
  title        String
  // ... other metadata fields
  authors      AuthorOnTitle[]
  narrators    NarratorOnTitle[]
  genres       Genre[]
  series       Series?  @relation(fields: [seriesAsin], references: [asin])
  seriesAsin   String?
  libraryEntries LibraryEntry[]
}

model Author {
  asin    String   @id
  name    String
  titles  AuthorOnTitle[]
}

model AuthorOnTitle {
  author      Author  @relation(fields: [authorAsin], references: [asin])
  authorAsin  String
  title       Title   @relation(fields: [titleAsin], references: [asin])
  titleAsin   String
  @@id([authorAsin, titleAsin])
}

// Similar pattern for NarratorOnTitle
```

**Alternatives considered**:
- **JSON fields**: Rejected, loses referential integrity and queryability
- **Separate tables per entity**: Chosen, enables efficient queries and data normalization

### R3: Admin Role Implementation

**Decision**: Add `isAdmin` boolean flag to User model. Check via middleware + page-level guards.

**Rationale**:
- Single admin user sufficient for MVP (per spec)
- Boolean flag is simplest approach (vs separate Admin table or role enum)
- Can migrate to role enum later if multiple admin types needed
- Environment variable controls which email gets admin flag on first login

**Implementation**:
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session?.user?.isAdmin) {
      return NextResponse.redirect(new URL('/library', request.url))
    }
  }
}

// lib/admin-auth.ts
export function isAdmin(user: User | null): user is User & { isAdmin: true } {
  return user?.isAdmin === true
}

// Auto-assign on login
if (user.email === process.env.ADMIN_EMAIL && !user.isAdmin) {
  await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } })
}
```

**Alternatives considered**:
- **Separate Admin table**: Rejected, over-engineering for single admin
- **Role enum**: Deferred to future iteration when multiple roles needed
- **Manual DB update**: Rejected, prefer automatic assignment on login

## Phase 1 Outputs

### Data Model

See [data-model.md](./data-model.md) for complete entity definitions, relationships, and validation rules.

**Key entities**:
- User (extended with `isAdmin` flag)
- Title (new, from Audnex API)
- LibraryEntry (updated to reference Title via ASIN)
- Author, Narrator, Genre, Series (new, from Audnex API)
- SyncHistory (new, audit log for imports)

### API Contracts

See [contracts/](./contracts/) for OpenAPI specifications.

**Endpoints**:
- POST `/api/admin/import` - Import extension JSON, fetch from Audnex
- GET `/api/admin/users` - List all users
- GET `/api/admin/users/:userId` - Get user details + library
- DELETE `/api/admin/users/:userId/library` - Drop user library
- GET `/api/admin/titles` - List all titles (paginated, searchable)
- GET `/api/admin/titles/:asin` - Get title metadata
- PUT `/api/admin/titles/:asin` - Update title metadata
- POST `/api/admin/titles/:asin/refresh` - Refresh from Audnex
- DELETE `/api/admin/titles` - Drop all titles (dev/test only)

### Test Scenarios

See [quickstart.md](./quickstart.md) for complete test scenarios with curl examples.

**Key scenarios**:
1. Import extension JSON (MVP - P1)
2. Admin login and access control (P2)
3. View and edit user libraries (P3)
4. Edit title metadata (P4)
5. Drop operations for testing (P5)

## Implementation Notes

### Import Endpoint Flow

1. **Validate JSON**: Check structure matches extension schema
2. **Process titles**: Loop through titleCatalog array
3. **Check library**: Does user already have this ASIN?
   - Yes: Update existing LibraryEntry (progress, rating, status)
   - No: Continue to step 4
4. **Check title catalog**: Does Title exist with this ASIN?
   - Yes: Create LibraryEntry linking user → existing Title
   - No: Continue to step 5
5. **Fetch from Audnex**: Call Audnex API for ASIN metadata
6. **Create title**: Insert Title + relations (Authors, Narrators, Genres, Series)
7. **Create library entry**: Link user → new Title with user-specific data
8. **Log import**: Create SyncHistory record

### Error Handling

- **Audnex API fails**: Log error, skip that title, continue processing
- **Network timeout**: Retry with exponential backoff (max 3 attempts)
- **Invalid ASIN**: Log warning, skip that title
- **Database constraint violation**: Transaction rollback, return error to user
- **Partial import success**: Return summary (titles imported, titles failed) + error details

### Performance Optimization

- **Batch Audnex calls**: Process 10 titles concurrently (use Promise.allSettled)
- **Database transactions**: Wrap each title import in transaction for atomicity
- **Prisma query optimization**: Use `include` selectively, only load needed relations
- **Pagination**: Admin titles list loads 50 at a time

### Production Considerations

**Before production deployment**:
1. Add confirmation dialogs for destructive operations (drop library, drop all titles)
2. Consider soft deletes instead of hard deletes (add `deletedAt` timestamp)
3. Add audit logging for admin actions (who deleted what, when)
4. Rate limit admin API endpoints (prevent abuse)
5. Add environment variable to disable destructive operations in production
6. Monitor Audnex API usage and implement caching layer if rate-limited

**Security review required**: This feature grants admin users powerful data access and destructive operations. Review admin auth guards and ensure no privilege escalation paths exist.

## Agent Context Updates

After Phase 1 completion, run:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This will update CLAUDE.md with:
- New admin routes pattern
- Audnex API integration example
- Prisma many-to-many relation patterns
- Admin role checking pattern
