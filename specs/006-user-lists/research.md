# Research: User Lists (006-user-lists)

**Date**: 2026-02-21

## R1: Drag-and-Drop Library

**Decision**: Use `@dnd-kit/core` + `@dnd-kit/sortable` (stable v6.x)

**Rationale**:
- Multi-container drag is essential for tier lists (dragging items between tier rows). dnd-kit's nested `SortableContext` pattern is purpose-built for this.
- Smaller bundle (~12-15kB gzipped vs ~30-35kB for @hello-pangea/dnd).
- More actively maintained (latest release Feb 2026 vs Feb 2025).
- Touch device support via modular sensor system.
- Accessible with keyboard sensors and configurable announcements.

**Alternatives considered**:
- `@hello-pangea/dnd` (v18.0.1): React 19 compatible but multi-container drag is limited to list-based patterns. No grid support. Larger bundle. Would work for recommendation lists but suboptimal for tier lists.
- `@dnd-kit/react` (new 0.x rewrite): Too early for production use; API still in flux.
- Native HTML5 drag events: Insufficient for complex tier list UX; poor touch support.

**Risk**: dnd-kit v6.x peer dependency may need `--legacy-peer-deps` for React 19. Mitigated by the active development and eventual v7 release.

---

## R2: Public Profile Routing (`[username]` at root level)

**Decision**: Use `app/[username]/` dynamic route alongside existing `(authenticated)` and `(auth)` route groups.

**Rationale**:
- Next.js resolves static routes before dynamic routes. Routes inside `(authenticated)/` (e.g., `/library`, `/dashboard`) are static and take priority over `[username]`.
- Route groups with `()` syntax are transparent to URL structure — no conflicts.
- This is the standard Next.js App Router pattern for user profiles.

**Conflict prevention**:
1. Reserved slug validation at username registration (block: `api`, `library`, `dashboard`, `settings`, `admin`, `auth`, `login`, `signin`, `_next`, etc.)
2. Middleware guard as defense-in-depth.
3. Single `[username]` segment (not catch-all `[...username]`).

**Alternatives considered**:
- `/u/[username]` prefix: Avoids all conflicts but produces uglier URLs. Not needed since Next.js resolution order handles this.
- `/profile/[username]`: Same tradeoff — less clean URLs without technical benefit.

---

## R3: Username Field on User Model

**Decision**: Add `username` field (optional initially, required for list sharing).

**Rationale**:
- Lists need a stable, human-readable URL (`/[username]/lists/[listId]`).
- Username is separate from display `name` — it's a URL-safe identifier.
- Optional at first so existing users aren't blocked; prompt to set on first list creation.

**Validation rules**:
- 3-30 characters
- Lowercase alphanumeric + hyphens only (`/^[a-z0-9][a-z0-9-]*[a-z0-9]$/`)
- No consecutive hyphens
- Cannot start or end with hyphen
- Must not collide with reserved slugs (checked at registration)
- Unique constraint in database

---

## R4: List Item Storage Strategy

**Decision**: Store `titleAsin` directly on ListItem (not `libraryEntryId`).

**Rationale**:
- LibraryEntry uses full-replace on sync (all entries deleted and recreated). If ListItem referenced `libraryEntryId`, all list items would be cascade-deleted on every sync.
- Storing `titleAsin` decouples list items from the sync lifecycle.
- Validation at list edit time checks the ASIN exists in the user's library.
- If a title is removed from the library, the list item persists (orphaned but harmless — metadata still available from Audnexus).

**Alternatives considered**:
- FK to `LibraryEntry.id`: Cascade-delete problem during sync makes this unworkable.
- FK to `LibraryEntry` with `SET NULL` on delete: Would leave null references in lists; messy.

---

## R5: List Visibility Model

**Decision**: All lists are public by default (per requirements). No visibility toggle in v1.

**Rationale**:
- Requirements specify lists are "intended to be shareable via a public URL and viewable by other users."
- Adding a visibility toggle (public/private/unlisted) adds complexity without being requested.
- Constitution principle V (User Control) suggests we should add this eventually, but it's P3 scope.

**Future consideration**: Add `visibility` enum (PUBLIC, PRIVATE, UNLISTED) in a later iteration.
