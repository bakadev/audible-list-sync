# Data Model

**Feature**: Extension Auto-Sync with Manual Upload Fallback
**Date**: 2026-02-12

## Overview

This feature does NOT introduce new database entities or schema changes. It extends existing functionality by adding new interaction patterns (auto-sync, manual upload) that use the same data models as the existing extension sync flow.

## Existing Entities Used

### SyncToken

Temporary authentication token for extension sync operations.

**Attributes**:
- `jti` (string): Unique token identifier (JWT ID)
- `userId` (string): User who owns this token
- `used` (boolean): Whether token has been consumed
- `expiresAt` (DateTime): Token expiration timestamp
- `createdAt` (DateTime): Token creation timestamp

**Usage in This Feature**:
- Extension auto-sync: Token detected from URL, passed in Authorization header
- Manual upload: Does NOT use sync tokens (uses NextAuth session instead)
- Existing validation logic unchanged (single-use, expiration check)

**Validation Rules**:
- Must not be expired
- Must not have been used previously
- Must match the user ID from JWT payload
- Automatically marked as `used=true` after successful sync

---

### LibraryEntry

Represents a title in a user's personal library (owned or wishlisted).

**Attributes**:
- `id` (string): Unique identifier
- `userId` (string): Foreign key to User
- `titleAsin` (string): Foreign key to Title (ASIN)
- `userRating` (number): User's personal rating (0-5 stars)
- `status` (string): Listening status (Not Started, In Progress, Finished)
- `progress` (number): Listening progress percentage (0-100)
- `timeLeft` (number, nullable): Estimated minutes remaining
- `source` (enum): LIBRARY or WISHLIST
- `createdAt` (DateTime): When added to user's library
- `updatedAt` (DateTime): Last modified timestamp

**Usage in This Feature**:
- Both auto-sync and manual upload create/update LibraryEntry records
- Full-replace strategy: All existing entries deleted, then recreated from sync data
- User-specific data (progress, ratings) preserved from imported JSON

**Relationships**:
- Belongs to User (userId foreign key)
- References Title (titleAsin foreign key)

---

### Title

Shared catalog of audiobook metadata (single source of truth for all users).

**Attributes**:
- `asin` (string): Primary key, Amazon Standard Identification Number
- `title` (string): Book title
- `subtitle` (string, nullable): Book subtitle
- `description` (string, nullable): Full description
- `summary` (string, nullable): Short summary
- `image` (string, nullable): Cover image URL
- `runtimeLengthMin` (number, nullable): Duration in minutes
- `rating` (decimal, nullable): Average rating from Audible
- `releaseDate` (DateTime, nullable): Publication date
- `publisherName` (string, nullable): Publisher
- `isbn` (string, nullable): ISBN if available
- `language` (string, nullable): Language code
- `region` (string, nullable): Region code (us, uk, etc.)
- `formatType` (string, nullable): Format (unabridged, abridged)
- `literatureType` (string, nullable): Type (fiction, non-fiction)
- `copyright` (number, nullable): Copyright year
- `isAdult` (boolean): Adult content flag
- `seriesAsin` (string, nullable): Foreign key to Series
- `seriesPosition` (string, nullable): Position in series
- `createdAt` (DateTime): When added to catalog
- `updatedAt` (DateTime): Last metadata update

**Usage in This Feature**:
- Fetched from Audnex API if not in catalog
- Populated with full metadata (authors, narrators, genres via join tables)
- Shared across all users for storage efficiency

**Relationships**:
- Has many LibraryEntry records (different users)
- Has many Authors (via AuthorOnTitle join table)
- Has many Narrators (via NarratorOnTitle join table)
- Has many Genres (via GenreOnTitle join table)
- Belongs to Series (optional, seriesAsin foreign key)

---

### Supporting Entities

#### Author
- `asin` (string): Author identifier
- `name` (string): Author name
- Related to Titles via `AuthorOnTitle` join table

#### Narrator
- `id` (number): Narrator identifier
- `name` (string): Narrator name
- Related to Titles via `NarratorOnTitle` join table

#### Genre
- `asin` (string): Genre/category identifier
- `name` (string): Genre name
- `type` (string): Genre type (tag, genre, etc.)
- Related to Titles via `GenreOnTitle` join table

#### Series
- `asin` (string): Series identifier
- `name` (string): Series name

---

## Data Flow

### Extension Auto-Sync Flow

1. Extension scrapes library data on Audible
2. Extension detects sync token from URL
3. Extension POSTs JSON payload to `/api/sync/import` with token
4. API validates token (SyncToken table lookup)
5. API marks token as `used=true`
6. API deletes user's existing LibraryEntry records (full-replace)
7. For each title in payload:
   - Check if Title exists in catalog (by ASIN)
   - If not, fetch from Audnex API and create Title + related entities
   - Create LibraryEntry linking user to title
8. API returns import stats

### Manual Upload Flow

1. User selects JSON file on library page
2. Client reads file with FileReader API
3. Client POSTs file to `/api/library/upload` endpoint
4. API validates NextAuth session (user authentication)
5. API parses file contents and validates JSON structure
6. API calls same import logic as auto-sync (steps 6-8 above)
7. API returns import stats
8. Client updates UI with result

---

## Validation Rules

### Import Payload Validation

Both auto-sync and manual upload enforce:
- `titles` array must be present and non-empty
- Each title must have:
  - `asin` (string, required)
  - `title` (string, required)
  - `authors` (array, required)
  - `source` (LIBRARY or WISHLIST, required)
  - `dateAdded` (string, required)
- Optional fields validated if present (type checking)
- Maximum payload size: 50MB (API limit)

### File Upload Validation

Manual upload adds:
- File type: Must be `.json` (checked by file extension and MIME type)
- File size: Must be < 5MB (prevents DoS)
- JSON parsing: Must be valid JSON structure
- Structure match: Must match `ImportTitle[]` interface

---

## State Transitions

### LibraryEntry Status

```
Not Started → In Progress → Finished
```

- Determined by `progress` field:
  - `progress === 0` → Not Started
  - `0 < progress < 100` → In Progress
  - `progress === 100` → Finished

### SyncToken Usage

```
Created (used=false) → Consumed (used=true)
```

- Single-use: Once `used=true`, token cannot be reused
- Automatic expiration: Tokens older than expiration time are invalid

---

## No Schema Changes Required

This feature reuses all existing database tables and relationships. No migrations needed.

**Existing Schema Coverage**:
- ✅ SyncToken table handles auto-sync authentication
- ✅ LibraryEntry table stores user library data
- ✅ Title table stores shared catalog metadata
- ✅ Join tables (AuthorOnTitle, NarratorOnTitle, GenreOnTitle) handle normalized relationships
- ✅ Series table handles series metadata

**Implementation Note**: Manual upload bypasses SyncToken entirely, using NextAuth session authentication instead. This is a different auth path but operates on the same database entities.
