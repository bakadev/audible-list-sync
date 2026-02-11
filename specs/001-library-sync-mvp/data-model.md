# Data Model: Audible Library Sync MVP

**Date**: 2026-02-11
**Feature**: Audible Library Sync MVP
**Database**: PostgreSQL 15+ via Prisma ORM

## Overview

The data model supports the MVP feature set (authentication, sync, library browsing) while future-proofing for post-MVP features (lists, sharing, multi-region). The schema follows constitutional principles: normalized title catalog, user-specific library entries, clear relationships.

## Entity Relationship Diagram

```
User (1) ──< (N) UserLibrary (N) ──> (1) TitleCatalog
  │                                         │
  │                                         │
  ├──< (N) SyncToken                        │
  ├──< (N) SyncHistory                      │
  ├──< (N) Session (NextAuth)               │
  ├──< (N) Account (NextAuth)               │
  │                                         │
  └──< (N) RecommendationList (deferred)    │
       │                                    │
       └──< (N) ListItem ──> (1) UserLibrary
  │
  └──< (N) TierList (deferred)
       │
       └──< (N) TierAssignment ──> (1) UserLibrary
```

## Core Entities (MVP)

### User

Represents a platform user account. Authenticated via Google OAuth.

**Fields**:
- `id` (String, UUID, primary key): Unique user identifier
- `googleId` (String, unique, indexed): Google OAuth user ID (from profile `sub` claim)
- `email` (String, unique, indexed): User's email from Google
- `name` (String, nullable): Display name from Google profile
- `image` (String, nullable): Avatar URL from Google profile
- `createdAt` (DateTime): Account creation timestamp
- `updatedAt` (DateTime): Last profile update

**Relationships**:
- Has many: `UserLibrary`, `SyncToken`, `SyncHistory`, `Session`, `Account`
- Has many (deferred): `RecommendationList`, `TierList`

**Indexes**:
- `googleId` (unique): Fast OAuth lookup
- `email` (unique): Fast email-based queries (future)

**Validation Rules**:
- `googleId` required, must match Google OAuth `sub` format
- `email` required, must be valid email format
- `name` max 200 characters
- `image` must be valid URL

**Privacy**: User records never deleted (for audit trail), only marked inactive. Email/name updatable from Google profile.

---

### TitleCatalog

Shared audiobook metadata catalog. One entry per unique ASIN. Shared across all users.

**Fields**:
- `id` (String, UUID, primary key): Internal identifier
- `asin` (String, unique, indexed): Amazon Standard Identification Number (unique audiobook ID)
- `title` (String): Book title
- `subtitle` (String, nullable): Subtitle if present
- `authors` (String[]): Array of author names
- `narrators` (String[]): Array of narrator names
- `seriesName` (String, nullable): Series name if part of series
- `seriesPosition` (Float, nullable): Position in series (e.g., 1.0, 2.5 for novellas)
- `duration` (Int, nullable): Duration in minutes
- `coverImageUrl` (String, nullable): URL to cover art
- `summary` (String, nullable): Book description/summary
- `rating` (Float, nullable): Aggregate Audible rating (0-5)
- `ratingCount` (Int, nullable): Number of ratings
- `publisher` (String, nullable): Publisher name
- `releaseDate` (DateTime, nullable): Publication date
- `language` (String, nullable): Language code (e.g., 'en', 'es')
- `categories` (String[]): Genre/category tags
- `createdAt` (DateTime): First sync timestamp
- `updatedAt` (DateTime): Last metadata update

**Relationships**:
- Has many: `UserLibrary`

**Indexes**:
- `asin` (unique): Primary lookup key
- `title` (GIN index for text search, optional for MVP): Fast title search
- `authors` (GIN index, optional for MVP): Fast author search

**Validation Rules**:
- `asin` required, must match ASIN format (10 alphanumeric characters)
- `title` required, max 500 characters
- `subtitle` max 500 characters
- `authors` required, non-empty array, each element max 200 characters
- `narrators` array, each element max 200 characters
- `duration` must be positive integer (minutes)
- `rating` must be between 0 and 5
- `ratingCount` must be non-negative
- `coverImageUrl` must be valid URL

**Update Strategy**: On sync, if ASIN exists and metadata changed (e.g., updated rating), update existing entry. Preserves relationships.

---

### UserLibrary

User-specific library entries. Links users to titles in catalog with personal metadata.

**Fields**:
- `id` (String, UUID, primary key): Unique entry identifier
- `userId` (String, foreign key → User): Owner
- `titleId` (String, foreign key → TitleCatalog): Title reference
- `source` (Enum: 'LIBRARY' | 'WISHLIST'): Where title exists in Audible
- `listeningProgress` (Int, default 0): Progress percentage (0-100)
- `personalRating` (Int, nullable): User's personal rating (1-5 stars)
- `dateAdded` (DateTime): When user acquired title in Audible
- `createdAt` (DateTime): First sync timestamp
- `updatedAt` (DateTime): Last sync update

**Relationships**:
- Belongs to: `User`, `TitleCatalog`
- Has many (deferred): `ListItem`, `TierAssignment`

**Indexes**:
- `userId` (indexed): Fast user library queries
- `titleId` (indexed): Fast title lookups
- `@@unique([userId, titleId])`: Prevent duplicate entries

**Validation Rules**:
- `userId` and `titleId` required
- `source` must be 'LIBRARY' or 'WISHLIST'
- `listeningProgress` must be between 0 and 100
- `personalRating` must be between 1 and 5 if set

**Deletion Strategy (MVP)**: Full replace on sync. All entries deleted, then re-imported. Post-MVP may use soft deletes to preserve list references.

---

### SyncToken

Tracks JWT tokens for sync operations. Enables single-use enforcement and revocation.

**Fields**:
- `id` (String, UUID, primary key): Internal identifier
- `jti` (String, unique, indexed): JWT ID (from token's `jti` claim)
- `userId` (String, foreign key → User): Token owner
- `used` (Boolean, default false, indexed): Whether token has been used
- `expiresAt` (DateTime, indexed): Token expiration time
- `createdAt` (DateTime): Token generation timestamp

**Relationships**:
- Belongs to: `User`

**Indexes**:
- `jti` (unique): Fast token validation lookup
- `used` (indexed): Fast filtering of unused tokens
- `expiresAt` (indexed): Fast cleanup of expired tokens

**Validation Rules**:
- `jti` required, must be valid UUID format
- `expiresAt` must be in future at creation time
- `used` defaults to false, becomes true after first use

**Lifecycle**:
1. Token generated: `used=false`, `expiresAt = now + 15min`
2. Extension uploads: Server validates, marks `used=true`
3. If used or expired, subsequent uploads rejected
4. Periodic cleanup: Delete tokens where `expiresAt < now - 24h`

---

### SyncHistory

Audit trail of sync operations. Provides dashboard data and debugging information.

**Fields**:
- `id` (String, UUID, primary key): Unique event identifier
- `userId` (String, foreign key → User): User who synced
- `syncedAt` (DateTime, indexed): Sync completion timestamp
- `titlesImported` (Int): Total titles in payload
- `newToCatalog` (Int): New ASINs added to TitleCatalog
- `libraryCount` (Int): Titles in library (source=LIBRARY)
- `wishlistCount` (Int): Titles in wishlist (source=WISHLIST)
- `warnings` (String[]): Warning messages (e.g., missing cover art)
- `success` (Boolean): Whether sync completed successfully
- `errorMessage` (String, nullable): Error message if failed

**Relationships**:
- Belongs to: `User`

**Indexes**:
- `userId` (indexed): Fast user history queries
- `syncedAt` (indexed): Fast sorting by date

**Validation Rules**:
- All count fields must be non-negative
- If `success=false`, `errorMessage` should be set
- `warnings` array may be empty

**Display**: Dashboard shows last 5 sync events, ordered by `syncedAt DESC`.

---

## NextAuth Tables

These tables are managed by NextAuth's Prisma adapter. Included for completeness.

### Account

Stores OAuth provider accounts linked to users.

**Fields**:
- `id` (String, UUID, primary key)
- `userId` (String, foreign key → User)
- `type` (String): Always 'oauth' for Google
- `provider` (String): Always 'google'
- `providerAccountId` (String): Google user ID (matches User.googleId)
- `refresh_token` (String, nullable): OAuth refresh token (encrypted)
- `access_token` (String, nullable): OAuth access token (encrypted)
- `expires_at` (Int, nullable): Access token expiry (Unix timestamp)
- `token_type` (String, nullable): Always 'Bearer'
- `scope` (String, nullable): Granted OAuth scopes
- `id_token` (String, nullable): OpenID Connect ID token
- `session_state` (String, nullable): OAuth session state
- `@@unique([provider, providerAccountId])`

**Managed by**: NextAuth adapter, do not modify manually.

---

### Session

Stores active user sessions (database session strategy).

**Fields**:
- `id` (String, UUID, primary key)
- `sessionToken` (String, unique, indexed): Session identifier (stored in cookie)
- `userId` (String, foreign key → User)
- `expires` (DateTime, indexed): Session expiration (30 days from creation)

**Managed by**: NextAuth adapter, do not modify manually.

**Cleanup**: NextAuth automatically deletes expired sessions.

---

### VerificationToken

Used by NextAuth for email verification (not used in MVP, Google OAuth only).

**Fields**:
- `identifier` (String): Email address
- `token` (String, unique): Verification token
- `expires` (DateTime): Token expiration
- `@@unique([identifier, token])`

**Managed by**: NextAuth adapter, unused in MVP.

---

## Deferred Entities (Post-MVP)

Tables exist in schema but remain empty until post-MVP features are implemented.

### RecommendationList

User-created themed lists (e.g., "Best LitRPG", "Favorite Narrators").

**Fields**:
- `id` (String, UUID, primary key)
- `userId` (String, foreign key → User): List owner
- `title` (String): List title
- `description` (String, nullable): List description
- `visibility` (Enum: 'PRIVATE' | 'UNLISTED' | 'PUBLIC'): Sharing control (all PRIVATE in MVP)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships**:
- Belongs to: `User`
- Has many: `ListItem`

---

### ListItem

Join table linking recommendation lists to user library entries. Maintains order.

**Fields**:
- `id` (String, UUID, primary key)
- `listId` (String, foreign key → RecommendationList)
- `userLibraryId` (String, foreign key → UserLibrary)
- `position` (Int): Order in list (1, 2, 3, ...)
- `note` (String, nullable): Optional note about why included
- `@@unique([listId, userLibraryId])`: Prevent duplicates
- `@@unique([listId, position])`: Ensure position uniqueness

**Relationships**:
- Belongs to: `RecommendationList`, `UserLibrary`

---

### TierList

User-created tier rankings (e.g., S/A/B/C/D/F).

**Fields**:
- `id` (String, UUID, primary key)
- `userId` (String, foreign key → User): List owner
- `title` (String): Tier list title
- `description` (String, nullable): Description
- `tierLabels` (String[]): Custom tier names (e.g., ['S', 'A', 'B', 'C'])
- `visibility` (Enum: 'PRIVATE' | 'UNLISTED' | 'PUBLIC'): Sharing control
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships**:
- Belongs to: `User`
- Has many: `TierAssignment`

---

### TierAssignment

Join table linking tier lists to user library entries with tier level.

**Fields**:
- `id` (String, UUID, primary key)
- `tierListId` (String, foreign key → TierList)
- `userLibraryId` (String, foreign key → UserLibrary)
- `tier` (String): Tier level (e.g., 'S', 'A', 'B')
- `position` (Int): Order within tier (for drag-and-drop)
- `@@unique([tierListId, userLibraryId])`: Prevent duplicates

**Relationships**:
- Belongs to: `TierList`, `UserLibrary`

---

## Prisma Schema Snippet

```prisma
// packages/db/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// Core MVP Entities
// ============================================================================

model User {
  id        String   @id @default(uuid())
  googleId  String   @unique
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  library          UserLibrary[]
  syncTokens       SyncToken[]
  syncHistory      SyncHistory[]
  sessions         Session[]
  accounts         Account[]

  // Deferred relations
  recommendationLists RecommendationList[]
  tierLists          TierList[]

  @@index([googleId])
  @@index([email])
}

model TitleCatalog {
  id             String    @id @default(uuid())
  asin           String    @unique
  title          String
  subtitle       String?
  authors        String[]
  narrators      String[]
  seriesName     String?
  seriesPosition Float?
  duration       Int?
  coverImageUrl  String?
  summary        String?
  rating         Float?
  ratingCount    Int?
  publisher      String?
  releaseDate    DateTime?
  language       String?
  categories     String[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  userLibraries UserLibrary[]

  @@index([asin])
}

model UserLibrary {
  id                String   @id @default(uuid())
  userId            String
  titleId           String
  source            LibrarySource
  listeningProgress Int      @default(0)
  personalRating    Int?
  dateAdded         DateTime
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  user   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  title  TitleCatalog @relation(fields: [titleId], references: [id], onDelete: Cascade)

  // Deferred relations
  listItems      ListItem[]
  tierAssignments TierAssignment[]

  @@unique([userId, titleId])
  @@index([userId])
  @@index([titleId])
}

enum LibrarySource {
  LIBRARY
  WISHLIST
}

model SyncToken {
  id        String   @id @default(uuid())
  jti       String   @unique
  userId    String
  used      Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([jti])
  @@index([used])
  @@index([expiresAt])
}

model SyncHistory {
  id             String   @id @default(uuid())
  userId         String
  syncedAt       DateTime
  titlesImported Int
  newToCatalog   Int
  libraryCount   Int
  wishlistCount  Int
  warnings       String[]
  success        Boolean
  errorMessage   String?

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([syncedAt])
}

// ============================================================================
// NextAuth Tables
// ============================================================================

model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([sessionToken])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ============================================================================
// Deferred Tables (Post-MVP)
// ============================================================================

model RecommendationList {
  id          String           @id @default(uuid())
  userId      String
  title       String
  description String?
  visibility  VisibilityLevel  @default(PRIVATE)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items ListItem[]
}

model ListItem {
  id            String @id @default(uuid())
  listId        String
  userLibraryId String
  position      Int
  note          String?

  list        RecommendationList @relation(fields: [listId], references: [id], onDelete: Cascade)
  userLibrary UserLibrary        @relation(fields: [userLibraryId], references: [id], onDelete: Cascade)

  @@unique([listId, userLibraryId])
  @@unique([listId, position])
}

model TierList {
  id          String           @id @default(uuid())
  userId      String
  title       String
  description String?
  tierLabels  String[]
  visibility  VisibilityLevel  @default(PRIVATE)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignments TierAssignment[]
}

model TierAssignment {
  id            String @id @default(uuid())
  tierListId    String
  userLibraryId String
  tier          String
  position      Int

  tierList    TierList    @relation(fields: [tierListId], references: [id], onDelete: Cascade)
  userLibrary UserLibrary @relation(fields: [userLibraryId], references: [id], onDelete: Cascade)

  @@unique([tierListId, userLibraryId])
}

enum VisibilityLevel {
  PRIVATE
  UNLISTED
  PUBLIC
}
```

---

## Migration Strategy

**Initial Migration**:
1. Create all tables (including deferred ones)
2. Deferred tables remain empty but are ready for future use
3. Run: `pnpm --filter db prisma migrate dev --name init`

**Future Migrations** (post-MVP examples):
- Add `region` column to TitleCatalog for multi-region support
- Add visibility controls to User table
- Add soft delete flags if needed for audit trail

**Data Seeding** (development only):
- Seed script can create test users and sample titles
- NOT used in production (real data comes from Audible syncs)

---

## Query Patterns

**Fetch user's library with titles**:
```typescript
const library = await prisma.userLibrary.findMany({
  where: { userId },
  include: { title: true },
  orderBy: { dateAdded: 'desc' }
});
```

**Search library by title or author**:
```typescript
const results = await prisma.userLibrary.findMany({
  where: {
    userId,
    title: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { authors: { has: query } }
      ]
    }
  },
  include: { title: true }
});
```

**Get sync history (last 5 events)**:
```typescript
const history = await prisma.syncHistory.findMany({
  where: { userId },
  orderBy: { syncedAt: 'desc' },
  take: 5
});
```

**Import transaction (full replace)**:
```typescript
await prisma.$transaction(async (tx) => {
  // Delete old entries
  await tx.userLibrary.deleteMany({ where: { userId } });

  // Upsert titles and create library entries
  for (const item of payload) {
    const title = await tx.titleCatalog.upsert({
      where: { asin: item.asin },
      update: { /* metadata */ },
      create: { /* metadata */ }
    });

    await tx.userLibrary.create({
      data: {
        userId,
        titleId: title.id,
        source: item.source,
        listeningProgress: item.progress,
        // ...
      }
    });
  }

  // Log sync
  await tx.syncHistory.create({
    data: { userId, titlesImported, /* ... */ }
  });
});
```

---

## Performance Considerations

**Indexes**: All foreign keys and frequently queried columns indexed.

**Full Text Search** (future optimization):
- PostgreSQL GIN indexes on `TitleCatalog.title` and `TitleCatalog.authors`
- Improves search performance for large catalogs (1000+ titles)

**Batch Operations**:
- Use `createMany` for bulk inserts (library entries)
- Use `deleteMany` for bulk deletes (re-sync)

**Connection Pooling**:
- Prisma Client uses connection pooling by default
- Configure pool size in `DATABASE_URL`: `?connection_limit=10`

---

## Conclusion

Data model is normalized, follows constitutional principles, and supports MVP features while future-proofing for post-MVP expansion. Prisma schema provides type safety and migration management. All queries are type-safe and SQL-injection proof.

**Ready for implementation**.
