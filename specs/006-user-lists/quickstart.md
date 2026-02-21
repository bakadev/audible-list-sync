# Quickstart: User Lists (006-user-lists)

**Date**: 2026-02-21

## Prerequisites

- Docker services running (`docker compose up -d`) — PostgreSQL, Audnexus, MongoDB, Redis
- `packages/ui` dependencies installed (`pnpm install`)
- A local user account with library entries synced (for testing list creation)

## Setup Steps

### 1. Install dnd-kit

```bash
cd packages/ui
pnpm add @dnd-kit/core@^6 @dnd-kit/sortable@^6 @dnd-kit/utilities@^3
```

> **Note**: If peer dependency warnings appear for React 19, use `--legacy-peer-deps`. dnd-kit v6 may not yet list React 19 as a peer dependency.

### 2. Run Prisma Migration

```bash
cd packages/ui
npx prisma migrate dev --name add-user-lists
```

This migration:
- Adds `username` (String?, unique) to the `User` model
- Creates `List` model (id, userId, name, description, type, tiers, timestamps)
- Creates `ListItem` model (id, listId, titleAsin, position, tier, createdAt)
- Creates `ListType` enum (RECOMMENDATION, TIER)
- Adds indexes on `List.userId`, `ListItem.listId`, `ListItem.[listId, titleAsin]` (unique), `ListItem.[listId, tier]`

### 3. Verify Schema

```bash
npx prisma studio
```

Open http://localhost:5555 and confirm `List`, `ListItem` tables exist and `User` has a `username` column.

## Key Files to Create

```text
packages/ui/src/
├── app/
│   ├── (authenticated)/
│   │   ├── lists/
│   │   │   ├── page.tsx              # Manage lists view (US-006)
│   │   │   ├── new/page.tsx          # Create list form (US-001)
│   │   │   └── [listId]/
│   │   │       └── edit/page.tsx     # Edit list editor (US-003, US-004, US-007)
│   │   └── settings/page.tsx        # Add username setting (US-011)
│   ├── [username]/
│   │   ├── page.tsx                  # Public profile (US-010)
│   │   └── lists/
│   │       └── [listId]/page.tsx     # Public list view (US-009)
│   └── api/
│       ├── lists/
│       │   ├── route.ts              # GET (my lists), POST (create)
│       │   └── [listId]/
│       │       ├── route.ts          # GET, PUT, DELETE
│       │       └── items/
│       │           └── route.ts      # PUT (bulk update items)
│       └── users/
│           ├── me/
│           │   └── username/
│           │       └── route.ts      # PUT (set username)
│           └── [username]/
│               └── lists/
│                   └── route.ts      # GET (public lists for user)
├── components/
│   └── lists/
│       ├── list-editor.tsx           # Drag-and-drop recommendation editor
│       ├── tier-list-editor.tsx      # Drag-and-drop tier editor
│       ├── list-card.tsx             # List card for manage view
│       ├── list-title-picker.tsx     # Library search + add to list
│       ├── public-list-view.tsx      # Public recommendation list renderer
│       └── public-tier-view.tsx      # Public tier list renderer
```

## Implementation Order

### Phase 1: Backend (no UI dependencies)
1. Update `prisma/schema.prisma` — add List, ListItem, ListType, username
2. Run migration
3. `POST /api/lists` — create list
4. `GET /api/lists` — fetch user's lists
5. `GET /api/lists/[listId]` — fetch single list with items + metadata
6. `PUT /api/lists/[listId]` — update list metadata
7. `DELETE /api/lists/[listId]` — delete list
8. `PUT /api/lists/[listId]/items` — bulk update items
9. `PUT /api/users/me/username` — set username
10. `GET /api/users/[username]/lists` — public list index
11. `GET /api/users/[username]/lists/[listId]` — public list detail (reusable logic from step 5)

### Phase 2: UI — List Management
1. Create list form page (`/lists/new`)
2. Manage lists page (`/lists`) with list cards
3. Dashboard entry points (link to create + manage)

### Phase 3: UI — List Editor
1. Library title picker component (search, select, add)
2. Recommendation list editor (single-container dnd-kit sortable)
3. Tier list editor (multi-container dnd-kit sortable)
4. Save flow (call `PUT /api/lists/[listId]/items`)

### Phase 4: Public Pages
1. Public list view (`/[username]/lists/[listId]`)
2. Public profile page (`/[username]`)
3. Username setting in user settings

## Testing Checklist

- [ ] Create a recommendation list with 3+ items, verify drag reorder, save, and reload
- [ ] Create a tier list with default S/A/B/C/D tiers, drag items between tiers
- [ ] Visit `/[username]/lists/[listId]` in an incognito window (unauthenticated)
- [ ] Try to create a list with name < 3 chars (should fail validation)
- [ ] Add 100 items, then try to add a 101st (should show error)
- [ ] Add the same title twice (should prevent duplicate)
- [ ] Delete a list and verify items are cascade-deleted
- [ ] Set a username, then visit `/[username]` to see public profile
- [ ] Try reserved usernames (`admin`, `api`, `library`) — should be rejected
- [ ] Test drag and drop on mobile/touch device
