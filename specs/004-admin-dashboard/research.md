# Research: Admin Dashboard & Data Import

**Feature**: 004-admin-dashboard
**Date**: 2026-02-11
**Purpose**: Document technical research findings that inform implementation decisions

## Overview

This document captures research conducted to resolve technical unknowns identified during planning. Key research areas: Audnex API integration patterns, Prisma many-to-many relationship best practices, and admin role implementation strategies.

## R1: Audnex API Integration Patterns

### Question

How should we integrate with the Audnex API (https://api.audnex.us) to fetch title metadata during import? What error handling is needed?

### Decision

Use native `fetch` with exponential backoff retry logic. Cache results in the Title table to avoid redundant API calls. Implement graceful degradation - log errors and continue processing remaining titles if one fetch fails.

### Rationale

- **Simplicity**: Native `fetch` is built into Node.js 18+ and browsers, no additional dependencies
- **Caching**: Storing in Title table means each ASIN is only fetched once, subsequent imports for same title reuse cached data
- **Resilience**: Exponential backoff handles transient network errors and rate limiting
- **User experience**: Partial success better than all-or-nothing failure

### Implementation Pattern

```typescript
// lib/audnex.ts
interface Audnex Title {
  asin: string
  title: string
  subtitle?: string
  authors: Array<{ asin: string; name: string }>
  narrators: Array<{ name: string }>
  series Primary?: { asin: string; name: string; position: string }
  genres: Array<{ asin: string; name: string; type: 'genre' | 'tag' }>
  runtimeLengthMin: number
  description: string
  summary: string
  image: string
  rating: string
  releaseDate: string
  publisherName: string
  isbn: string
  language: string
  region: string
  // ... other fields
}

async function fetchTitleMetadata(
  asin: string,
  retries = 3
): Promise<AudnexTitle | null> {
  try {
    const response = await fetch(`https://api.audnex.us/books/${asin}`)

    if (!response.ok) {
      // Retry on rate limits and server errors
      if (response.status === 429 || response.status >= 500) {
        if (retries > 0) {
          const backoffMs = Math.pow(2, 3 - retries) * 1000 // 1s, 2s, 4s
          await sleep(backoffMs)
          return fetchTitleMetadata(asin, retries - 1)
        }
      }

      // Non-retryable errors (404, 400, etc)
      console.warn(`Audnex API error ${response.status} for ${asin}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Audnex API network error for ${asin}:`, error)
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

### Alternatives Considered

**Option A: Use axios library**
- **Pros**: Built-in retry logic, interceptors, timeout handling
- **Cons**: Adds dependency when fetch is sufficient
- **Rejected**: Native fetch is adequate for our needs

**Option B: Background sync all titles on schedule**
- **Pros**: Keeps metadata fresh automatically
- **Cons**: Violates "no background scraping" constitutional principle, wastes API calls
- **Rejected**: Import-time fetching is more aligned with user-initiated principle

**Option C: Bulk API endpoint (if available)**
- **Pros**: Fewer network round-trips
- **Cons**: Audnex API doesn't support bulk lookups (checked documentation)
- **Rejected**: Not available

### Open Questions

- **Audnex API rate limits**: Unknown, documentation doesn't specify. Will monitor and adjust retry strategy if rate-limited in practice.
- **API stability**: Assuming schema is stable based on provided sample. Will add schema validation if API changes break imports.

### References

- Audnex API documentation: https://api.audnex.us (public, no auth required)
- Sample response provided by user (see spec.md)

---

## R2: Prisma Many-to-Many Relationship Best Practices

### Question

How should we model the relationships between Titles and Authors/Narrators/Genres in Prisma? Explicit join tables vs implicit relations?

### Decision

Use **explicit join tables** (AuthorOnTitle, NarratorOnTitle) for Author and Narrator relationships. Use **implicit relations** for Genre relationship.

### Rationale

- **Author/Narrator complexity**: These entities have their own metadata (ASIN for authors, name for narrators) and may need additional fields in future (bio, image URL)
- **Genre simplicity**: Genres are just ASIN + name + type, unlikely to need join table metadata
- **Query performance**: Explicit join tables give more control over indexes and query optimization
- **Prisma best practices**: Use explicit join tables when join needs metadata or when relationship might evolve

### Implementation Pattern

```prisma
// Explicit join table for Authors (has metadata: ASIN, name)
model Title {
  asin           String            @id
  title          String
  authors        AuthorOnTitle[]
  narrators      NarratorOnTitle[]
  genres         Genre[]
  series         Series?           @relation(fields: [seriesAsin], references: [asin])
  seriesAsin     String?
  libraryEntries LibraryEntry[]
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
}

model Author {
  asin    String          @id
  name    String
  titles  AuthorOnTitle[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([name])
}

model AuthorOnTitle {
  author      Author   @relation(fields: [authorAsin], references: [asin], onDelete: Cascade)
  authorAsin  String
  title       Title    @relation(fields: [titleAsin], references: [asin], onDelete: Cascade)
  titleAsin   String

  @@id([authorAsin, titleAsin])
  @@index([titleAsin])
}

// Similar pattern for NarratorOnTitle
model Narrator {
  id      String            @id @default(cuid())
  name    String
  titles  NarratorOnTitle[]
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  @@unique([name])
  @@index([name])
}

model NarratorOnTitle {
  narrator    Narrator @relation(fields: [narratorId], references: [id], onDelete: Cascade)
  narratorId  String
  title       Title    @relation(fields: [titleAsin], references: [asin], onDelete: Cascade)
  titleAsin   String

  @@id([narratorId, titleAsin])
  @@index([titleAsin])
}

// Implicit relation for Genres (simple, no join metadata needed)
model Genre {
  asin    String   @id
  name    String
  type    String   // 'genre' or 'tag'
  titles  Title[]
  createdAt DateTime @default(now())

  @@index([name])
  @@index([type])
}
```

### Query Patterns

```typescript
// Fetch title with all relations
const title = await prisma.title.findUnique({
  where: { asin: 'B09GHRGYRF' },
  include: {
    authors: {
      include: { author: true }
    },
    narrators: {
      include: { narrator: true }
    },
    genres: true,
    series: true
  }
})

// Fetch all titles by an author
const authorTitles = await prisma.author.findUnique({
  where: { asin: 'B07PT82W6F' },
  include: {
    titles: {
      include: { title: true }
    }
  }
})
```

### Alternatives Considered

**Option A: Store as JSON fields**
- **Pros**: Simpler schema, no join tables
- **Cons**: Loses referential integrity, can't query by author/narrator efficiently, no data normalization
- **Rejected**: Violates Constitution Principle III (Data Normalization & Efficiency)

**Option B: Implicit relations for everything**
- **Pros**: Less boilerplate, Prisma handles joins automatically
- **Cons**: Can't add metadata to relationships later without migration, less control over performance
- **Rejected**: Explicit join tables offer more flexibility for future needs

### Migration Strategy

```bash
# Generate migration after updating schema.prisma
npx prisma migrate dev --name add_title_catalog

# Verify migration doesn't break existing data
npx prisma migrate deploy --preview-feature
```

### References

- Prisma many-to-many relations: https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations
- Explicit vs implicit: https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations#explicit-many-to-many-relations

---

## R3: Admin Role Implementation

### Question

How should we implement admin role assignment and access control? Separate Admin table, role enum, or boolean flag?

### Decision

Add `isAdmin` boolean flag to existing User model. Auto-assign on login if user email matches `ADMIN_EMAIL` environment variable. Protect routes with middleware + page-level guards.

### Rationale

- **MVP scope**: Spec requires single admin user, boolean is simplest approach
- **Automatic assignment**: No manual DB manipulation needed, happens on first login
- **Route protection**: Next.js middleware provides centralized access control
- **Future-proof**: Can migrate to role enum later if multiple roles needed

### Implementation Pattern

```typescript
// prisma/schema.prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  isAdmin       Boolean   @default(false)  // NEW
  libraryEntries LibraryEntry[]
  syncHistory   SyncHistory[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// middleware.ts
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.redirect(new URL('/api/auth/signin', request.url))
    }

    if (!session.user.isAdmin) {
      return NextResponse.redirect(new URL('/library', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}

// lib/admin-auth.ts
import { User } from '@prisma/client'

export function isAdmin(user: User | null | undefined): user is User & { isAdmin: true } {
  return user?.isAdmin === true
}

export async function requireAdmin(user: User | null | undefined) {
  if (!isAdmin(user)) {
    throw new Error('Unauthorized: Admin access required')
  }
}

// Auto-assign admin on login (in NextAuth callbacks)
// lib/auth.ts
export const authOptions: AuthOptions = {
  // ... other config
  callbacks: {
    async signIn({ user }) {
      if (user.email === process.env.ADMIN_EMAIL) {
        await prisma.user.update({
          where: { email: user.email },
          data: { isAdmin: true }
        })
      }
      return true
    },
    async session({ session, user }) {
      session.user.isAdmin = user.isAdmin
      return session
    }
  }
}

// Environment variable
// .env
ADMIN_EMAIL=admin@example.com
```

### Page-Level Guard Example

```typescript
// app/(authenticated)/admin/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin-auth'

export default async function AdminDashboard() {
  const session = await getServerSession()

  if (!isAdmin(session?.user)) {
    redirect('/library')
  }

  // Render admin dashboard
  return <div>Admin Dashboard</div>
}
```

### Alternatives Considered

**Option A: Separate Admin table**
- **Pros**: Clean separation of concerns
- **Cons**: Over-engineering for single admin, adds foreign key complexity
- **Rejected**: Boolean flag is simpler for MVP scope

**Option B: Role enum (USER, ADMIN, MODERATOR)**
- **Pros**: Extensible for multiple role types
- **Cons**: Premature abstraction, spec only requires one admin
- **Deferred**: Can migrate to this if future features need role hierarchy

**Option C: Manual database update for admin flag**
- **Pros**: Simple, one-time operation
- **Cons**: Requires direct DB access, error-prone, not portable across environments
- **Rejected**: Auto-assignment on login is more reliable and environment-agnostic

### Migration

```prisma
// Migration: Add isAdmin field
model User {
  isAdmin Boolean @default(false)
}
```

```bash
npx prisma migrate dev --name add_admin_role
```

### Security Considerations

- **Environment variable**: Store admin email in .env, never commit to git
- **Middleware**: Middleware runs on every request, ensure performance is acceptable
- **Session check**: Always verify isAdmin flag from database, not just JWT (prevent token tampering)

### References

- Next.js middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- NextAuth callbacks: https://next-auth.js.org/configuration/callbacks

---

## Summary

All technical unknowns have been resolved:
1. **Audnex API integration**: Native fetch with exponential backoff, graceful degradation
2. **Prisma relations**: Explicit join tables for Author/Narrator, implicit for Genre
3. **Admin role**: Boolean flag on User model with auto-assignment and middleware protection

No blocking issues identified. Ready to proceed to data model design (Phase 1).
