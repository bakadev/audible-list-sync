# Tasks: User Lists (Recommendations + Tier Lists)

**Input**: Design documents from `/specs/006-user-lists/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/api.md, research.md, quickstart.md

**Tests**: No test framework mandated by constitution. Tests are NOT included in these tasks. Manual testing checklist is in quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create directory structure

- [x] T001 Install @dnd-kit/core@^6, @dnd-kit/sortable@^6, and @dnd-kit/utilities@^3 in packages/ui (use --legacy-peer-deps if needed for React 19)
- [x] T002 [P] Create directory structure for list components at packages/ui/src/components/lists/
- [x] T003 [P] Create directory structure for list API routes at packages/ui/src/app/api/lists/ and packages/ui/src/app/api/lists/[listId]/ and packages/ui/src/app/api/lists/[listId]/items/
- [x] T004 [P] Create directory structure for public routes at packages/ui/src/app/[username]/ and packages/ui/src/app/[username]/lists/[listId]/ and packages/ui/src/app/api/users/me/username/ and packages/ui/src/app/api/users/[username]/lists/ and packages/ui/src/app/api/users/[username]/lists/[listId]/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared validation, and infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add List model, ListItem model, ListType enum (RECOMMENDATION, TIER), and `username` field (String?, @unique) on User to packages/ui/prisma/schema.prisma per data-model.md — include all indexes, cascade rules, and @@unique([listId, titleAsin]) constraint on ListItem. Add `lists List[]` relation on User.
- [x] T006 Run Prisma migration: `npx prisma migrate dev --name add-user-lists` in packages/ui/
- [x] T007 [P] Create list validation helpers in packages/ui/src/lib/list-validation.ts — export functions: `validateListName(name)` (3-80 chars, trimmed), `validateListDescription(desc)` (max 500 chars, trimmed, nullable), `validateListType(type)` (RECOMMENDATION or TIER), `validateTiers(tiers)` (array of 1-10 strings, each 1-20 chars), `validateListItems(items, maxItems=100)` (max count, no duplicate ASINs)
- [x] T008 [P] Create username validation helpers in packages/ui/src/lib/username-validation.ts — export functions: `validateUsername(username)` (3-30 chars, lowercase alphanumeric + hyphens, no start/end hyphen, no consecutive hyphens, regex `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/`), `isReservedUsername(username)` (check against reserved slugs: api, admin, auth, signin, login, register, dashboard, library, lists, settings, _next, favicon.ico, robots.txt, sitemap.xml)
- [x] T009 Implement PUT /api/users/me/username endpoint in packages/ui/src/app/api/users/me/username/route.ts — auth check, validate username format, check reserved slugs, check uniqueness via Prisma, update user record. Return 200 with `{ username }` on success, 400/409 on validation/conflict errors per contracts/api.md
- [x] T010 Update middleware in packages/ui/src/middleware.ts to allow unauthenticated access to /[username] routes — ensure dynamic `[username]` paths are NOT protected by auth, while existing routes (/admin, /dashboard, /library, /lists, /settings) remain protected

**Checkpoint**: Foundation ready — schema migrated, validation helpers available, username API functional, middleware configured

---

## Phase 3: Core List CRUD & Management (US-001, US-005, US-006, US-007, US-008) — P1 MVP

**Goal**: Users can create, view, edit metadata, and delete lists. This is the minimum viable feature.

**Independent Test**: Create a list via API or UI form, see it in manage lists page, edit its name, delete it. Verify auth guards work (401/403).

### Implementation

- [x] T011 [US1] [US6] Create /api/lists route in packages/ui/src/app/api/lists/route.ts — implement GET handler (return all lists for authenticated user with id, name, description, type, tiers, itemCount, timestamps) and POST handler (create new list with name/description/type/tiers validation per contracts/api.md, default tiers ["S","A","B","C","D"] for TIER type if not provided). Both require auth session check.
- [x] T012 [US1] [US7] [US8] Create /api/lists/[listId] route in packages/ui/src/app/api/lists/[listId]/route.ts — implement GET handler (single list with items enriched with Audnexus metadata via fetchTitleMetadataBatch), PUT handler (update name/description/tiers, type immutable, validate ownership), DELETE handler (delete list + cascade items, validate ownership). All require auth + ownership check returning 403 if not owner, 404 if not found.
- [x] T013 [P] [US6] Create ListCard component in packages/ui/src/components/lists/list-card.tsx — display list name, type badge (RECOMMENDATION/TIER), item count, last updated date, and action buttons (Edit link, Delete with confirmation dialog). Use shadcn Card, Badge, Button, and Dialog components. Accept onDelete callback prop.
- [x] T014 [US1] Create list form page in packages/ui/src/app/(authenticated)/lists/new/page.tsx — server component wrapper with auth check. Render a client-side form with: name input (required, 3-80 chars), description textarea (optional, max 500 chars), type radio/select (RECOMMENDATION or TIER). On submit, POST to /api/lists and redirect to /lists/[listId]/edit on success. Show validation errors inline.
- [x] T015 [US6] [US7] [US8] Create manage lists page in packages/ui/src/app/(authenticated)/lists/page.tsx — server component that fetches lists from /api/lists. Render grid of ListCard components. Include "Create new list" button linking to /lists/new. Show empty state when user has no lists. Add page metadata (title: "My Lists").
- [x] T016 [US6] Add "My Lists" navigation link to FloatingNav in packages/ui/src/components/shared/floating-nav.tsx — add navItem for `/lists` with appropriate icon (e.g., lucide ListOrdered) alongside existing Dashboard and Library links. Only show when authenticated.
- [x] T017 [P] [US1] Add "Create new list" entry point to dashboard page in packages/ui/src/app/(authenticated)/dashboard/page.tsx — add a card or button linking to /lists/new, and a "Manage Lists" link to /lists. Place in the dashboard grid layout.

**Checkpoint**: Users can create lists, see them in manage view, edit metadata, and delete them. Lists persist in database.

---

## Phase 4: List Editor — Add Titles & Reorder (US-002, US-003, US-005) — P1

**Goal**: Users can add titles from their library to a list, reorder them with drag-and-drop, and save the ordering to the database.

**Independent Test**: Open a recommendation list editor, search library, add 3+ titles, drag to reorder, save. Reload page and verify order persists. Try adding a duplicate (should fail). Try adding 101st item (should fail).

**Dependencies**: Phase 3 complete (lists exist to edit)

### Implementation

- [x] T018 [US2] [US5] Create PUT /api/lists/[listId]/items bulk update endpoint in packages/ui/src/app/api/lists/[listId]/items/route.ts — accept `{ items: [{ titleAsin, position, tier? }] }`. Validate: auth + ownership, max 100 items, no duplicate ASINs, each ASIN exists in user's libraryEntries (query Prisma), tier required for TIER lists and must match list's configured tiers, tier forbidden for RECOMMENDATION lists. Use Prisma transaction: deleteMany existing items then createMany new items. Return enriched list with Audnexus metadata (same shape as GET /api/lists/[listId]).
- [x] T019 [P] [US2] Create ListTitlePicker component in packages/ui/src/components/lists/list-title-picker.tsx — client component that searches user's library via existing GET /api/library?search=X endpoint. Debounce input by 300ms. Display matching titles with cover image, title, authors. Click to add title to list (callback prop). Show "already in list" indicator for titles already added. Show loading spinner during search. Show empty state when no library entries match.
- [x] T020 [US3] Create ListEditor component in packages/ui/src/components/lists/list-editor.tsx — client component using @dnd-kit/core DndContext and @dnd-kit/sortable SortableContext with verticalListSortingStrategy. Render sortable list items showing cover thumbnail, title, author, and drag handle. Implement onDragEnd to reorder items array. Support removing items (X button). Use @dnd-kit/sortable useSortable hook per item. Configure PointerSensor and TouchSensor for cross-device support. Include KeyboardSensor for accessibility.
- [x] T021 [US2] [US3] [US5] Create edit list page in packages/ui/src/app/(authenticated)/lists/[listId]/edit/page.tsx — server component that fetches list via GET /api/lists/[listId] (redirect to /lists if 404/403). Render client EditListPage component with: list metadata header (name, description, editable inline or via modal), ListTitlePicker for adding items, ListEditor for recommendation lists, Save button that calls PUT /api/lists/[listId]/items with current items array. Show success toast on save, error toast on failure.

**Checkpoint**: Users can search library, add titles to recommendation lists, drag to reorder, and save. Full round-trip persists ordering.

---

## Phase 5: Tier List Editor (US-004) — P1

**Goal**: Users can drag titles between tiers in a tier list and reorder within tiers.

**Independent Test**: Create a TIER list, add titles, drag items between S/A/B/C/D tiers, reorder within a tier, save. Reload and verify tier assignments and ordering persist.

**Dependencies**: Phase 4 complete (editor infrastructure exists)

### Implementation

- [x] T022 [US4] Create TierListEditor component in packages/ui/src/components/lists/tier-list-editor.tsx — client component using @dnd-kit/core DndContext with multiple SortableContext containers (one per tier). Render tier rows with tier label, colored background, and sortable items within each tier. Implement onDragEnd to handle: reordering within same tier (update positions), moving item between tiers (update tier + position). Use DragOverlay for smooth visual feedback during cross-container drags. Configure collision detection with closestCenter or closestCorners. Support PointerSensor, TouchSensor, and KeyboardSensor.
- [x] T023 [US4] Update edit list page in packages/ui/src/app/(authenticated)/lists/[listId]/edit/page.tsx — conditionally render TierListEditor (for TIER type) or ListEditor (for RECOMMENDATION type) based on list.type. Pass tiers configuration from list data. Ensure save handler includes tier field in items payload for tier lists.

**Checkpoint**: Both recommendation lists and tier lists are fully editable with drag-and-drop.

---

## Phase 6: Public Viewing (US-009, US-010) — P1

**Goal**: Anyone can view a user's public profile and individual lists at stable URLs without authentication.

**Independent Test**: Set a username (via API), create and save a list with items. Open `/[username]` in incognito browser — should see profile with list index. Open `/[username]/lists/[listId]` — should see full list with book metadata. Try non-existent username — should see 404. Try listId belonging to different user — should see 404.

**Dependencies**: Phase 4 complete (lists with items exist to view)

### Implementation

- [x] T024 [P] [US10] Create GET /api/users/[username]/lists endpoint in packages/ui/src/app/api/users/[username]/lists/route.ts — no auth required. Look up user by username (404 if not found). Return `{ user: { username, name, image }, lists: [...] }` with list summaries (id, name, description, type, itemCount, timestamps). Exclude internal fields like userId.
- [x] T025 [P] [US9] Create GET /api/users/[username]/lists/[listId] endpoint in packages/ui/src/app/api/users/[username]/lists/[listId]/route.ts — no auth required. Look up user by username, then list by id. Return 404 if user not found, list not found, or list.userId doesn't match user.id. Return list with items enriched with Audnexus metadata (batch-fetch). Include user object in response.
- [x] T026 [P] [US9] Create PublicListView component in packages/ui/src/components/lists/public-list-view.tsx — render recommendation list items as numbered cards with cover image, title, authors, narrators. Read-only display (no drag, no edit). Responsive grid layout.
- [x] T027 [P] [US9] Create PublicTierView component in packages/ui/src/components/lists/public-tier-view.tsx — render tier list items grouped by tier with colored tier labels (S=red, A=orange, B=yellow, C=green, D=blue or similar). Read-only display. Each tier row shows items as cards. Responsive layout.
- [x] T028 [US9] Create public list page in packages/ui/src/app/[username]/lists/[listId]/page.tsx — server component. Fetch list via internal API or direct Prisma query (user by username + list by id + items + Audnexus metadata). Render list name, description, author info (username, avatar). Render PublicListView or PublicTierView based on type. Show 404 via notFound() if user/list not found. Add generateMetadata for SEO (title, description).
- [x] T029 [US10] Create public profile page in packages/ui/src/app/[username]/page.tsx — server component. Fetch user by username and their lists. Render user avatar, display name, and grid of list cards (name, type, item count). Link each card to /[username]/lists/[listId]. Show 404 via notFound() if username not found. Add generateMetadata for SEO.
- [x] T030 [P] [US9] [US10] Create layout for [username] routes in packages/ui/src/app/[username]/layout.tsx — minimal layout without authenticated FloatingNav. Include shared Container wrapper and Footer. No auth check required (public pages).

**Checkpoint**: Public profile and list pages are fully functional. Visitors can browse lists without authentication.

---

## Phase 7: Username Settings (US-011) — P2

**Goal**: Users can set and manage their username through the settings UI, and are prompted to set one when creating their first list.

**Independent Test**: Navigate to /settings, enter a username, save. Verify it appears in the settings form. Try reserved names (should reject). Try duplicate names (should reject). Create a list without a username — should be prompted to set one first.

**Dependencies**: Phase 2 (username API exists), Phase 3 (list creation exists)

### Implementation

- [x] T031 [US11] Add username form section to settings page in packages/ui/src/app/(authenticated)/settings/page.tsx — add a "Public Profile" section with username input field, current username display (if set), save button. Client-side validation using validateUsername from lib/username-validation.ts. Call PUT /api/users/me/username on save. Show success/error toasts. Display current public profile URL (`/[username]`) when username is set.
- [x] T032 [US11] Create UsernamePrompt dialog component in packages/ui/src/components/lists/username-prompt.tsx — shadcn Dialog that prompts user to set a username before creating their first list. Show when user clicks "Create new list" and has no username set. Include username input with validation, save button. On success, proceed to list creation. Integrate into create list flow in packages/ui/src/app/(authenticated)/lists/new/page.tsx.

**Checkpoint**: Username management is fully functional via settings page and prompted during first list creation.

---

## Phase 8: Tier Customization (US-012) — P2

**Goal**: Users can customize tier names and add/remove tiers when editing a tier list.

**Independent Test**: Edit a tier list, rename "S" to "S+", add a new "F" tier, remove "D" tier. Items in removed tier should move to an "Unassigned" state or first available tier. Save and verify changes persist.

**Dependencies**: Phase 5 (tier list editor exists)

### Implementation

- [x] T033 [US12] Add tier configuration UI to TierListEditor in packages/ui/src/components/lists/tier-list-editor.tsx — add inline tier name editing (click to rename, 1-20 chars), "Add tier" button (max 10 tiers), "Remove tier" button per tier row (with confirmation if tier has items). When a tier is removed, move its items to an "Unassigned" pool or redistribute. Tier changes update local state; persisted when user saves (PUT /api/lists/[listId] for tier names + PUT /api/lists/[listId]/items for item reassignment).

**Checkpoint**: Tier lists are fully customizable — users can configure tier names and structure.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, UX refinement, and edge case handling across all stories

- [x] T034 Add keyboard navigation and screen reader announcements to ListEditor and TierListEditor — configure dnd-kit KeyboardSensor with sortableKeyboardCoordinates, add aria-labels to drag handles, implement custom screen reader announcements for drag start/over/end in packages/ui/src/components/lists/list-editor.tsx and packages/ui/src/components/lists/tier-list-editor.tsx
- [x] T035 [P] Add loading skeletons to manage lists page and edit list page in packages/ui/src/app/(authenticated)/lists/page.tsx and packages/ui/src/app/(authenticated)/lists/[listId]/edit/page.tsx — use Suspense boundaries with skeleton fallbacks matching card/editor layouts
- [x] T036 [P] Add error states and error boundaries to list pages — handle API failures gracefully with retry options in packages/ui/src/app/(authenticated)/lists/page.tsx, edit page, and public pages
- [x] T037 [P] Add empty states to manage lists page (no lists yet), title picker (no library entries / no search results), and public profile (user has no lists) — include helpful CTAs in packages/ui/src/components/lists/
- [x] T038 Add touch device optimization to drag-and-drop editors — add visible drag handles, increase touch targets, configure activationConstraint with distance threshold (8px) to prevent accidental drags on scroll in packages/ui/src/components/lists/list-editor.tsx and packages/ui/src/components/lists/tier-list-editor.tsx
- [x] T039 [P] Add "My Lists" link to UserNav dropdown in packages/ui/src/components/dashboard/user-nav.tsx — add ListOrdered icon and link to /lists in the dropdown menu alongside existing Settings and Admin links

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **Phase 3 (CRUD & Management)**: Depends on Phase 2
- **Phase 4 (Editor)**: Depends on Phase 3 (lists must exist to edit)
- **Phase 5 (Tier Editor)**: Depends on Phase 4 (editor infrastructure)
- **Phase 6 (Public Pages)**: Depends on Phase 4 (lists with items must exist to view) — can run in parallel with Phase 5
- **Phase 7 (Username Settings)**: Depends on Phase 2 (username API) + Phase 3 (list creation) — can run in parallel with Phases 4-6
- **Phase 8 (Tier Customization)**: Depends on Phase 5 (tier editor must exist)
- **Polish (Phase 9)**: Depends on all desired phases being complete

### User Story Dependencies

```
Phase 2 (Foundation)
  ├── Phase 3 (US-001, US-005, US-006, US-007, US-008) ← MVP
  │     ├── Phase 4 (US-002, US-003) ← Full editor
  │     │     ├── Phase 5 (US-004) ← Tier editor
  │     │     │     └── Phase 8 (US-012) ← Tier customization
  │     │     └── Phase 6 (US-009, US-010) ← Public pages [parallel with Phase 5]
  │     └── Phase 7 (US-011) ← Username settings [parallel with Phases 4-6]
  └── Phase 9 (Polish) ← After all desired phases
```

### Within Each Phase

- API routes before UI pages that consume them
- Shared components before pages that render them
- Core implementation before integration/refinement
- Complete the phase before moving to the next

### Parallel Opportunities

**Phase 1**: T002, T003, T004 can all run in parallel
**Phase 2**: T007 and T008 can run in parallel (after T006)
**Phase 3**: T013 (ListCard) and T017 (dashboard entry) can run in parallel with API tasks. T011 and T012 are in different files and can run in parallel.
**Phase 4**: T019 (title picker) can run in parallel with T020 (list editor) — different files
**Phase 6**: T024, T025, T026, T027, T030 can all run in parallel — then T028, T029 combine them
**Phase 9**: T035, T036, T037, T039 can all run in parallel — different files

---

## Parallel Example: Phase 3

```bash
# Launch API routes in parallel (different files):
Task T011: "Create /api/lists route in packages/ui/src/app/api/lists/route.ts"
Task T012: "Create /api/lists/[listId] route in packages/ui/src/app/api/lists/[listId]/route.ts"

# Launch components in parallel with API (different files):
Task T013: "Create ListCard component in packages/ui/src/components/lists/list-card.tsx"
Task T017: "Add 'Create new list' entry point to dashboard"

# Then sequentially (depends on API + components):
Task T014: "Create list form page"
Task T015: "Create manage lists page"
Task T016: "Add 'My Lists' nav link to FloatingNav"
```

## Parallel Example: Phase 6

```bash
# Launch all API + components in parallel (all different files):
Task T024: "GET /api/users/[username]/lists endpoint"
Task T025: "GET /api/users/[username]/lists/[listId] endpoint"
Task T026: "PublicListView component"
Task T027: "PublicTierView component"
Task T030: "[username] layout"

# Then sequentially (depend on above):
Task T028: "Public list page"
Task T029: "Public profile page"
```

---

## Implementation Strategy

### MVP First (Phase 3 Only)

1. Complete Phase 1: Setup (install dnd-kit, create directories)
2. Complete Phase 2: Foundational (schema, validation, username API)
3. Complete Phase 3: Core List CRUD & Management
4. **STOP and VALIDATE**: Create a list, see it in manage view, edit metadata, delete
5. Deploy/demo if ready — users can create and manage lists (no items yet)

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Phase 3 → List CRUD works → Deploy (MVP!)
3. Phase 4 → Users can add titles and reorder → Deploy
4. Phase 5 → Tier lists fully editable → Deploy
5. Phase 6 → Public pages live → Deploy (feature complete for P1!)
6. Phase 7 → Username settings UI → Deploy
7. Phase 8 → Tier customization → Deploy (P2 complete)
8. Phase 9 → Polish → Deploy (production ready)

### Feature Flag Approach (Optional)

No feature flag needed for initial development on the `006-user-lists` branch. The feature is isolated:
- New routes (`/lists/*`, `/[username]/*`) don't conflict with existing routes
- New schema additions are backward-compatible (username is nullable, List/ListItem are new tables)
- Merge to main when Phase 6 is complete (all P1 stories done)

---

## Notes

- [P] tasks = different files, no dependencies on other tasks in the same phase
- [Story] labels map tasks to user stories from spec.md for traceability
- Each phase should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate the phase independently
- All API routes follow the pattern established in existing /api/library/route.ts
- Book metadata is always fetched from Audnexus via fetchTitleMetadataBatch() — never stored in List/ListItem tables
- Avoid: vague tasks, same file conflicts, cross-phase dependencies that break independence
