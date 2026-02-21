# API Contract: User Lists (006-user-lists)

**Date**: 2026-02-21

## Base URL

All authenticated endpoints: `/api/lists/...`
All public endpoints: `/api/users/[username]/lists/...`

## Authentication

- **Authenticated endpoints**: Require valid NextAuth session (cookie-based). Return `401` if unauthenticated.
- **Public endpoints**: No authentication required.
- **Authorization**: Owner-only for create/update/delete. Return `403` if user doesn't own the resource.

---

## Endpoints

### 1. List CRUD (Authenticated)

#### `GET /api/lists`

Fetch all lists owned by the authenticated user.

**Query Parameters**: None

**Response `200 OK`**:
```json
{
  "lists": [
    {
      "id": "cm1abc...",
      "name": "Best LitRPG of 2025",
      "description": "My top picks from this year",
      "type": "RECOMMENDATION",
      "itemCount": 12,
      "createdAt": "2026-02-21T10:00:00.000Z",
      "updatedAt": "2026-02-21T14:30:00.000Z"
    },
    {
      "id": "cm2def...",
      "name": "Narrator Tier Rankings",
      "description": null,
      "type": "TIER",
      "tiers": ["S", "A", "B", "C", "D"],
      "itemCount": 25,
      "createdAt": "2026-02-20T08:00:00.000Z",
      "updatedAt": "2026-02-21T09:15:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated

---

#### `POST /api/lists`

Create a new list.

**Request Body**:
```json
{
  "name": "Best LitRPG of 2025",
  "description": "My top picks from this year",
  "type": "RECOMMENDATION"
}
```

**Tier list variant**:
```json
{
  "name": "Narrator Tier Rankings",
  "description": null,
  "type": "TIER",
  "tiers": ["S", "A", "B", "C", "D"]
}
```

**Validation**:
| Field | Rule |
|-------|------|
| `name` | Required, 3-80 chars, trimmed |
| `description` | Optional, max 500 chars, trimmed |
| `type` | Required, enum: `RECOMMENDATION` or `TIER` |
| `tiers` | Required if type is `TIER`. Array of 1-10 strings, each 1-20 chars. Optional for `RECOMMENDATION` (ignored). Defaults to `["S", "A", "B", "C", "D"]` if type is `TIER` and not provided. |

**Response `201 Created`**:
```json
{
  "id": "cm1abc...",
  "name": "Best LitRPG of 2025",
  "description": "My top picks from this year",
  "type": "RECOMMENDATION",
  "tiers": null,
  "items": [],
  "createdAt": "2026-02-21T10:00:00.000Z",
  "updatedAt": "2026-02-21T10:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation failed (returns `{ error: string, details?: object }`)
- `401 Unauthorized`: Not authenticated

---

#### `GET /api/lists/[listId]`

Fetch a single list with all items (for editing).

**Response `200 OK`**:
```json
{
  "id": "cm1abc...",
  "name": "Best LitRPG of 2025",
  "description": "My top picks from this year",
  "type": "RECOMMENDATION",
  "tiers": null,
  "items": [
    {
      "id": "item1...",
      "titleAsin": "B0EXAMPLE1",
      "position": 0,
      "tier": null,
      "title": {
        "asin": "B0EXAMPLE1",
        "title": "Defiance of the Fall 12",
        "authors": ["TheFirstDefier", "JF Brink"],
        "narrators": ["Pavi Proczko"],
        "image": "https://m.media-amazon.com/images/I/...",
        "runtimeLengthMin": 2400
      }
    },
    {
      "id": "item2...",
      "titleAsin": "B0EXAMPLE2",
      "position": 1,
      "tier": null,
      "title": {
        "asin": "B0EXAMPLE2",
        "title": "Primal Hunter 10",
        "authors": ["Zogarth"],
        "narrators": ["Travis Baldree"],
        "image": "https://m.media-amazon.com/images/I/...",
        "runtimeLengthMin": 1800
      }
    }
  ],
  "createdAt": "2026-02-21T10:00:00.000Z",
  "updatedAt": "2026-02-21T14:30:00.000Z"
}
```

**Tier list response** (items include `tier` field):
```json
{
  "id": "cm2def...",
  "name": "Narrator Tier Rankings",
  "description": null,
  "type": "TIER",
  "tiers": ["S", "A", "B", "C", "D"],
  "items": [
    {
      "id": "item1...",
      "titleAsin": "B0EXAMPLE1",
      "position": 0,
      "tier": "S",
      "title": { "asin": "B0EXAMPLE1", "title": "...", "authors": ["..."], "narrators": ["..."], "image": "...", "runtimeLengthMin": 2400 }
    },
    {
      "id": "item2...",
      "titleAsin": "B0EXAMPLE2",
      "position": 0,
      "tier": "A",
      "title": { "asin": "B0EXAMPLE2", "title": "...", "authors": ["..."], "narrators": ["..."], "image": "...", "runtimeLengthMin": 1800 }
    }
  ],
  "createdAt": "2026-02-20T08:00:00.000Z",
  "updatedAt": "2026-02-21T09:15:00.000Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't own this list
- `404 Not Found`: List doesn't exist

---

#### `PUT /api/lists/[listId]`

Update list metadata (name, description, tiers).

**Request Body**:
```json
{
  "name": "Updated List Name",
  "description": "Updated description",
  "tiers": ["S+", "S", "A", "B", "C", "D"]
}
```

**Validation**:
| Field | Rule |
|-------|------|
| `name` | Optional (no change if omitted), 3-80 chars if provided |
| `description` | Optional, max 500 chars, set to `null` to clear |
| `tiers` | Optional, only for TIER lists. 1-10 items, each 1-20 chars. Existing items assigned to removed tiers become untiered. |

**Note**: `type` cannot be changed after creation.

**Response `200 OK`**: Returns the updated list (same shape as `GET /api/lists/[listId]`).

**Error Responses**:
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't own this list
- `404 Not Found`: List doesn't exist

---

#### `DELETE /api/lists/[listId]`

Delete a list and all its items.

**Response `204 No Content`**: Success, no body.

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't own this list
- `404 Not Found`: List doesn't exist

---

### 2. List Items (Authenticated)

#### `PUT /api/lists/[listId]/items`

Bulk update all items in a list. Replaces the entire item set (full-replace strategy).

This is the primary endpoint for saving drag-and-drop changes. The client sends the complete ordered list of items after any reordering, additions, or removals.

**Request Body** (Recommendation list):
```json
{
  "items": [
    { "titleAsin": "B0EXAMPLE1", "position": 0 },
    { "titleAsin": "B0EXAMPLE2", "position": 1 },
    { "titleAsin": "B0EXAMPLE3", "position": 2 }
  ]
}
```

**Request Body** (Tier list):
```json
{
  "items": [
    { "titleAsin": "B0EXAMPLE1", "position": 0, "tier": "S" },
    { "titleAsin": "B0EXAMPLE2", "position": 0, "tier": "A" },
    { "titleAsin": "B0EXAMPLE3", "position": 1, "tier": "A" },
    { "titleAsin": "B0EXAMPLE4", "position": 0, "tier": "C" }
  ]
}
```

**Validation**:
| Rule | Detail |
|------|--------|
| Max 100 items | Return 400 if exceeded |
| No duplicate ASINs | Return 400 if same ASIN appears twice |
| Valid ASINs | Each ASIN must exist in the user's library. Return 400 with list of invalid ASINs if not. |
| Tier required for TIER lists | Each item must have a `tier` value that matches one of the list's configured tiers |
| Tier forbidden for RECOMMENDATION lists | `tier` must be null/absent for recommendation lists |
| Positions sequential | Positions must be 0-indexed and sequential within each tier (or overall for recommendation lists) |

**Response `200 OK`**: Returns updated list with items (same shape as `GET /api/lists/[listId]`).

**Error Responses**:
- `400 Bad Request`: Validation failed (includes `{ error: string, invalidAsins?: string[] }`)
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't own this list
- `404 Not Found`: List doesn't exist

---

### 3. Public Endpoints (Unauthenticated)

#### `GET /api/users/[username]/lists`

Fetch all public lists for a user.

**Response `200 OK`**:
```json
{
  "user": {
    "username": "travis",
    "name": "Travis Wilson",
    "image": "https://..."
  },
  "lists": [
    {
      "id": "cm1abc...",
      "name": "Best LitRPG of 2025",
      "description": "My top picks from this year",
      "type": "RECOMMENDATION",
      "itemCount": 12,
      "createdAt": "2026-02-21T10:00:00.000Z",
      "updatedAt": "2026-02-21T14:30:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `404 Not Found`: Username doesn't exist

---

#### `GET /api/users/[username]/lists/[listId]`

Fetch a single public list with all items and metadata.

**Response `200 OK`**: Same shape as `GET /api/lists/[listId]` but includes `user` object:
```json
{
  "user": {
    "username": "travis",
    "name": "Travis Wilson",
    "image": "https://..."
  },
  "id": "cm1abc...",
  "name": "Best LitRPG of 2025",
  "description": "My top picks from this year",
  "type": "RECOMMENDATION",
  "tiers": null,
  "items": [
    {
      "id": "item1...",
      "titleAsin": "B0EXAMPLE1",
      "position": 0,
      "tier": null,
      "title": {
        "asin": "B0EXAMPLE1",
        "title": "Defiance of the Fall 12",
        "authors": ["TheFirstDefier", "JF Brink"],
        "narrators": ["Pavi Proczko"],
        "image": "https://m.media-amazon.com/images/I/...",
        "runtimeLengthMin": 2400
      }
    }
  ],
  "createdAt": "2026-02-21T10:00:00.000Z",
  "updatedAt": "2026-02-21T14:30:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Username doesn't exist, list doesn't exist, or list doesn't belong to this user

---

### 4. Username Management (Authenticated)

#### `PUT /api/users/me/username`

Set or update the authenticated user's username.

**Request Body**:
```json
{
  "username": "travis"
}
```

**Validation**:
| Rule | Detail |
|------|--------|
| Length | 3-30 characters |
| Characters | Lowercase alphanumeric + hyphens only |
| Format | Cannot start or end with hyphen, no consecutive hyphens |
| Pattern | `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/` (or `/^[a-z0-9]$/` for 1-char, but min is 3) |
| Uniqueness | Must not be taken by another user |
| Reserved | Must not match reserved slugs: `api`, `admin`, `auth`, `signin`, `login`, `register`, `dashboard`, `library`, `lists`, `settings`, `_next`, `favicon.ico`, `robots.txt`, `sitemap.xml` |

**Response `200 OK`**:
```json
{
  "username": "travis"
}
```

**Error Responses**:
- `400 Bad Request`: Validation failed (includes `{ error: string, code: "INVALID_FORMAT" | "RESERVED" | "TOO_SHORT" | "TOO_LONG" }`)
- `401 Unauthorized`: Not authenticated
- `409 Conflict`: Username already taken (includes `{ error: "Username already taken", code: "TAKEN" }`)

---

### 5. Library Search (Authenticated, existing endpoint)

#### `GET /api/library`

Used by the list title picker to search the user's library. **Already exists** — no changes needed. Returns paginated library entries with metadata from Audnexus.

**Relevant Query Parameters**:
- `search`: Filter by title/author/narrator name
- `source`: Filter by `LIBRARY`, `WISHLIST`, or `EXTENSION`
- `page`, `limit`: Pagination

---

## Response Conventions

### Success Responses
- `200 OK`: Successful GET, PUT
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE

### Error Response Shape
```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

### Common Error Codes
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Not the resource owner |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Request body failed validation |
| `DUPLICATE_ASIN` | 400 | Same ASIN appears twice in items |
| `INVALID_ASIN` | 400 | ASIN not in user's library |
| `MAX_ITEMS_EXCEEDED` | 400 | More than 100 items |
| `TAKEN` | 409 | Username already taken |
| `RESERVED` | 400 | Username is a reserved slug |

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────┐
│ Client (React)                                       │
├──────────────────────┬──────────────────────────────┤
│ Authenticated Routes │ Public Routes                 │
│ /api/lists/*         │ /api/users/[username]/lists/* │
├──────────────────────┴──────────────────────────────┤
│ Next.js API Routes (server)                          │
├─────────────────────────┬───────────────────────────┤
│ PostgreSQL (Prisma)     │ Audnexus API (metadata)   │
│ - User, List, ListItem  │ - Book titles, authors    │
│ - Ownership, ordering   │ - Cover images, duration  │
└─────────────────────────┴───────────────────────────┘
```

1. **Create/Edit flow**: Client → `POST/PUT /api/lists` → Prisma write → return list
2. **Save items flow**: Client → `PUT /api/lists/[listId]/items` → validate ASINs against library → Prisma transaction (delete old items + create new) → batch-fetch metadata from Audnexus → return enriched list
3. **Public view flow**: Visitor → `GET /api/users/[username]/lists/[listId]` → Prisma read (join User+List+Items) → batch-fetch metadata from Audnexus → return enriched response
