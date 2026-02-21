# Data Model: User Lists (006-user-lists)

**Date**: 2026-02-21

## Entity Relationship Diagram

```
User (1) ──── (N) List (1) ──── (N) ListItem
  │                  │
  └─ username        └─ tiers (JSON, tier lists only)
```

## Schema Changes

### Modified: User

Add `username` field for public profile URLs.

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| username | String? | No (optional) | 3-30 chars, lowercase alphanumeric + hyphens, unique | Nullable; prompted on first list creation |

```prisma
model User {
  // ... existing fields ...
  username  String?   @unique

  // ... existing relations ...
  lists     List[]

  @@index([username])
}
```

**Reserved usernames** (enforced at application level):
`api`, `admin`, `auth`, `signin`, `login`, `register`, `dashboard`, `library`, `lists`, `settings`, `_next`, `favicon.ico`, `robots.txt`, `sitemap.xml`

---

### New: List

| Field | Type | Required | Default | Validation | Notes |
|-------|------|----------|---------|------------|-------|
| id | String (UUID) | Yes | `cuid()` | - | Primary key |
| userId | String | Yes | - | FK to User.id | Owner |
| name | String | Yes | - | 3-80 chars, trimmed | Display name |
| description | String? | No | null | Max 500 chars, trimmed | Optional description |
| type | ListType | Yes | - | RECOMMENDATION or TIER | Immutable after creation |
| tiers | Json? | No | null | Array of tier names | Only for TIER type; e.g. `["S","A","B","C","D"]` |
| createdAt | DateTime | Yes | `now()` | - | - |
| updatedAt | DateTime | Yes | `@updatedAt` | - | - |

```prisma
model List {
  id          String    @id @default(cuid())
  userId      String
  name        String
  description String?   @db.Text
  type        ListType
  tiers       Json?     // ["S", "A", "B", "C", "D"] for tier lists
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items ListItem[]

  @@index([userId])
}

enum ListType {
  RECOMMENDATION
  TIER
}
```

---

### New: ListItem

| Field | Type | Required | Default | Validation | Notes |
|-------|------|----------|---------|------------|-------|
| id | String | Yes | `cuid()` | - | Primary key |
| listId | String | Yes | - | FK to List.id | Parent list |
| titleAsin | String | Yes | - | Valid ASIN | References book in Audnexus |
| position | Int | Yes | - | >= 0 | Sort order within list/tier |
| tier | String? | No | null | Must match a tier name in parent List.tiers | Only for TIER lists |
| createdAt | DateTime | Yes | `now()` | - | - |

```prisma
model ListItem {
  id         String   @id @default(cuid())
  listId     String
  titleAsin  String
  position   Int
  tier       String?  // "S", "A", "B", etc. — only for tier lists
  createdAt  DateTime @default(now())

  list List @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@unique([listId, titleAsin])  // No duplicate titles in a list
  @@index([listId])
  @@index([listId, tier])        // Efficient tier queries
}
```

---

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| User | `username` (unique) | Public profile lookup |
| List | `userId` | Fetch user's lists |
| ListItem | `listId` | Fetch list items |
| ListItem | `[listId, titleAsin]` (unique) | Prevent duplicate titles |
| ListItem | `[listId, tier]` | Efficient tier grouping |

## Cascade Rules

| Parent | Child | On Delete |
|--------|-------|-----------|
| User | List | CASCADE (delete user → delete all lists) |
| List | ListItem | CASCADE (delete list → delete all items) |

## Constraints

- Max 100 items per list (enforced at application level)
- Max 10 tiers per tier list (enforced at application level)
- Tier names: 1-20 chars each (enforced at application level)
- List name: 3-80 chars (enforced at application level)
- Description: max 500 chars (enforced at application level)

## Example Data

### Recommendation List
```json
{
  "id": "cm...",
  "userId": "uuid...",
  "name": "Best LitRPG of 2025",
  "description": "My top picks from this year",
  "type": "RECOMMENDATION",
  "tiers": null,
  "items": [
    { "id": "cm1", "titleAsin": "B0EXAMPLE1", "position": 0, "tier": null },
    { "id": "cm2", "titleAsin": "B0EXAMPLE2", "position": 1, "tier": null },
    { "id": "cm3", "titleAsin": "B0EXAMPLE3", "position": 2, "tier": null }
  ]
}
```

### Tier List
```json
{
  "id": "cm...",
  "userId": "uuid...",
  "name": "Narrator Tier Rankings",
  "description": null,
  "type": "TIER",
  "tiers": ["S", "A", "B", "C", "D"],
  "items": [
    { "id": "cm1", "titleAsin": "B0EXAMPLE1", "position": 0, "tier": "S" },
    { "id": "cm2", "titleAsin": "B0EXAMPLE2", "position": 0, "tier": "A" },
    { "id": "cm3", "titleAsin": "B0EXAMPLE3", "position": 1, "tier": "A" },
    { "id": "cm4", "titleAsin": "B0EXAMPLE4", "position": 0, "tier": "C" }
  ]
}
```
