# Tasks: Audible Library Sync MVP (Website Only - packages/ui)

**Input**: Design documents from `specs/001-library-sync-mvp/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/
**Scope**: Website implementation (packages/ui) only. Extension, Docker setup, and shared types deferred to later rounds.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize Next.js project with TypeScript, Tailwind, and shadcn/ui

- [x] T001 Create Next.js 14+ project in packages/ui with TypeScript strict mode and App Router
- [x] T002 [P] Configure Tailwind CSS in packages/ui/tailwind.config.ts with custom theme (Tailwind v4 uses CSS config in globals.css)
- [x] T003 [P] Initialize shadcn/ui components library with base configuration
- [x] T004 [P] Create packages/ui/src/app/globals.css with Tailwind directives and CSS variables
- [x] T005 Create packages/ui/tsconfig.json with strict mode enabled and path aliases (@/ for src/)
- [x] T006 [P] Create packages/ui/.env.example with required environment variables template
- [x] T007 [P] Create packages/ui/PURPOSE.md documenting package responsibilities
- [x] T008 [P] Configure Next.js in packages/ui/next.config.js (enable standalone output, image domains)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create Prisma schema in packages/ui/prisma/schema.prisma with all tables (User, TitleCatalog, UserLibrary, SyncToken, SyncHistory, Account, Session, VerificationToken, deferred list tables)
- [x] T010 Generate initial Prisma migration in packages/ui/prisma/migrations/ for complete schema
- [x] T011 Create Prisma Client singleton in packages/ui/src/lib/prisma.ts with connection pooling
- [x] T012 Create JWT utility module in packages/ui/src/lib/jwt.ts for token signing and validation (HS256, 15min TTL)
- [x] T013 Configure Auth.js (NextAuth) in packages/ui/src/lib/auth.ts with Google OAuth provider and Prisma adapter
- [x] T014 Create NextAuth API route in packages/ui/src/app/api/auth/[...nextauth]/route.ts
- [x] T015 Create authentication middleware in packages/ui/src/middleware.ts for route protection
- [x] T016 [P] Install shadcn/ui components: Button, Input, Card, Badge, Table, Dialog, Avatar

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Google OAuth Authentication (Priority: P1) 🎯 MVP

**Goal**: Users can create accounts and authenticate via Google OAuth

**Independent Test**: Complete OAuth flow, verify user record created, dashboard displays user name

### Implementation for User Story 1

- [x] T017 [P] [US1] Create landing page in packages/ui/src/app/page.tsx with "Sign in with Google" button
- [x] T018 [P] [US1] Create root layout in packages/ui/src/app/layout.tsx with metadata and global styles
- [x] T019 [P] [US1] Create auth layout in packages/ui/src/app/(auth)/layout.tsx with centered form styling
- [x] T020 [US1] Create sign-in page in packages/ui/src/app/(auth)/signin/page.tsx with Google OAuth button and error handling
- [x] T021 [US1] Create dashboard layout in packages/ui/src/app/dashboard/layout.tsx with navigation (dashboard, library links) and user avatar
- [x] T022 [US1] Create empty dashboard page in packages/ui/src/app/dashboard/page.tsx (protected route) with welcome message
- [x] T023 [P] [US1] Create UserNav component in packages/ui/src/components/dashboard/user-nav.tsx with avatar, name, and logout button
- [x] T024 [US1] Update middleware in packages/ui/src/middleware.ts to protect /dashboard and /library routes (redirect to signin if unauthenticated)

**Checkpoint**: OAuth flow complete, users can sign in/out, dashboard accessible

---

## Phase 4: User Story 2 - Generate Sync Token (Priority: P2)

**Goal**: Authenticated users can generate JWT sync tokens for extension connection

**Independent Test**: Click "Connect extension", verify token generated, Audible URL opened with token in fragment

### Implementation for User Story 2

- [x] T025 [US2] Create POST /api/sync/token route in packages/ui/src/app/api/sync/token/route.ts that generates JWT, creates SyncToken record, returns token + Audible URL
- [x] T026 [P] [US2] Create SyncStatus component in packages/ui/src/components/dashboard/sync-status.tsx displaying connection state, last sync time, item counts
- [x] T027 [P] [US2] Create ConnectExtensionButton component in packages/ui/src/components/dashboard/connect-extension-button.tsx that calls /api/sync/token and opens Audible URL
- [x] T028 [US2] Update dashboard page in packages/ui/src/app/dashboard/page.tsx to display SyncStatus and ConnectExtensionButton
- [x] T029 [US2] Implement token generation logic: query latest SyncHistory, check if user has synced before, generate JWT with jti claim, insert SyncToken record with expires_at

**Checkpoint**: Token generation works, dashboard shows connection status

---

## Phase 5: User Story 3 - Import Endpoint (Priority: P3)

**Goal**: Server can accept extension payload, validate JWT, process titles into database

**Independent Test**: POST mock JSON payload to /api/sync/import with valid JWT, verify titles imported, UserLibrary populated

### Implementation for User Story 3

- [x] T030 [US3] Create POST /api/sync/import route in packages/ui/src/app/api/sync/import/route.ts with JWT validation from Authorization header
- [x] T031 [US3] Implement JWT validation logic in import route: extract token, verify signature, check expiry, extract user ID from sub claim
- [x] T032 [US3] Implement SyncToken single-use check: query SyncToken by jti, verify not used, mark as used in transaction
- [x] T033 [US3] Implement payload validation in import route: check required fields (titles array, ASIN, title, authors, source, dateAdded), validate types, check size under 50MB
- [x] T034 [US3] Implement full-replace import strategy in Prisma transaction: delete all UserLibrary entries for user, then process payload
- [x] T035 [US3] Implement title catalog upsert logic: for each title, check ASIN exists in TitleCatalog, insert if new, update if metadata changed
- [x] T036 [US3] Implement UserLibrary batch insert: collect all UserLibrary entries from payload, createMany after catalog processing
- [x] T037 [US3] Implement SyncHistory logging: after transaction commit, insert SyncHistory record with counts (imported, newToCatalog, libraryCount, wishlistCount) and warnings array
- [x] T038 [US3] Implement import response: return JSON with success=true, imported count, newToCatalog count, library/wishlist counts, warnings array
- [x] T039 [US3] Implement error handling: catch validation errors (400), token errors (401), transaction errors (500), return appropriate error responses

**Checkpoint**: Import endpoint functional, can process payloads and populate database

---

## Phase 6: User Story 4 - Browse Library (Priority: P4)

**Goal**: Users can view their synced library with search functionality

**Independent Test**: Seed user library with test data, verify library page displays titles, search filters results

### Implementation for User Story 4

- [x] T040 [P] [US4] Create GET /api/library route in packages/ui/src/app/api/library/route.ts that queries UserLibrary with title relations, supports search query param (title/author/narrator filter), returns paginated results
- [x] T041 [P] [US4] Create GET /api/library/stats route in packages/ui/src/app/api/library/stats/route.ts that returns aggregate counts (total, library, wishlist, total duration, last sync)
- [x] T042 [US4] Create library page in packages/ui/src/app/library/page.tsx (protected route) with title list and search bar
- [x] T043 [P] [US4] Create TitleCard component in packages/ui/src/components/library/title-card.tsx displaying cover, title, authors, narrators, duration, progress bar, library/wishlist badge
- [x] T044 [P] [US4] Create SearchBar component in packages/ui/src/components/library/search-bar.tsx with real-time filtering (debounced input)
- [x] T045 [P] [US4] Create EmptyState component in packages/ui/src/components/library/empty-state.tsx with "No titles yet" message and link to dashboard
- [x] T046 [US4] Implement client-side search logic in library page: fetch /api/library with search query param, update UI with results, show loading state
- [x] T047 [US4] Implement empty state handling: if no synced data, show EmptyState component instead of title list

**Checkpoint**: Library page displays titles, search works, empty state handled

---

## Phase 7: Dashboard Enhancements (Priority: P5)

**Goal**: Dashboard displays sync history, item counts, warnings, and supports re-sync

**Independent Test**: Sync once, verify dashboard shows stats, click "Update library" to trigger re-sync

### Implementation for Dashboard

- [x] T048 [P] [US5] Create GET /api/sync/history route in packages/ui/src/app/api/sync/history/route.ts that queries SyncHistory for user, returns last 5 events ordered by syncedAt DESC
- [x] T049 [P] [US5] Create SyncHistoryTable component in packages/ui/src/components/dashboard/sync-history-table.tsx displaying sync events with timestamp, counts, warnings, success status
- [x] T050 [US5] Update SyncStatus component to fetch /api/library/stats and display total counts, library/wishlist breakdown, last sync timestamp
- [x] T051 [US5] Update ConnectExtensionButton to show "Update library" text if user has synced before (check SyncHistory)
- [x] T052 [US5] Update dashboard page to fetch /api/sync/history and display SyncHistoryTable below sync status
- [x] T053 [US5] Add loading states to dashboard components (skeleton placeholders for SyncStatus, SyncHistoryTable while fetching)
- [x] T054 [US5] Add error handling to dashboard: if API calls fail, show error message with retry button

**Checkpoint**: Dashboard fully functional with sync history, stats, and re-sync capability

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

- [x] T055 [P] Add responsive design breakpoints to all pages (mobile, tablet, desktop) with Tailwind responsive classes
- [x] T056 [P] Add loading skeletons to library page while fetching titles
- [x] T057 [P] Add toast notifications for user actions (sync started, import successful, errors) using Sonner toast library
- [x] T058 [P] Add proper error pages: 404 in packages/ui/src/app/not-found.tsx, 500 in packages/ui/src/app/error.tsx
- [x] T059 [P] Optimize images with next/image component for cover art in TitleCard
- [x] T060 [P] Add metadata and SEO tags to all pages (title, description, og tags)
- [x] T061 Add Prisma Studio script to packages/ui/package.json for visual database browsing
- [x] T062 [P] Document environment variables in packages/ui/README.md with setup instructions
- [x] T063 Validate TypeScript compilation with no errors: run tsc --noEmit
- [x] T064 [P] Run ESLint and fix any warnings in packages/ui/src/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): No dependencies on other stories
  - US2 (Phase 4): Depends on US1 (requires authenticated users)
  - US3 (Phase 5): Depends on US2 (requires token generation) - can run in parallel with US4 if seeding data manually
  - US4 (Phase 6): Depends on US3 (requires imported data) OR can use manually seeded data to develop in parallel
  - US5 (Phase 7): Depends on US2, US3, US4 (reuses token generation, import, and display)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (requires authentication)
- **User Story 3 (P3)**: Depends on US2 (requires token system) - Extension uploading part deferred
- **User Story 4 (P4)**: Depends on US3 (requires data import) OR can develop with mock/seeded data in parallel
- **User Story 5 (P5)**: Depends on US2, US3, US4 (reuses existing flows)

### Within Each User Story

- Prisma schema before all (Phase 2)
- Auth configuration before protected routes (Phase 2)
- API routes before UI components that call them
- Components can be built in parallel if no dependencies
- US4 can develop in parallel with US3 if using manually seeded data

### Parallel Opportunities

- **Setup Phase**: T002, T003, T004, T006, T007, T008 can run in parallel (different files)
- **Foundational Phase**: T016 (shadcn components) can run in parallel with Prisma/Auth setup
- **User Story 1**: T017, T018, T019, T023 can run in parallel (different files)
- **User Story 2**: T026, T027 can run in parallel (separate components)
- **User Story 4**: T040, T041, T043, T044, T045 can run in parallel (different files)
- **User Story 5**: T048, T049 can run in parallel (different files)
- **Polish Phase**: Most tasks (T055-T060, T064) can run in parallel (cross-cutting concerns)

---

## Parallel Example: User Story 1

```bash
# Launch multiple User Story 1 tasks together:
Task: "Create landing page in packages/ui/src/app/page.tsx"
Task: "Create root layout in packages/ui/src/app/layout.tsx"
Task: "Create auth layout in packages/ui/src/app/(auth)/layout.tsx"
Task: "Create UserNav component in packages/ui/src/components/dashboard/user-nav.tsx"
```

These can be developed simultaneously as they touch different files.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test OAuth flow independently
5. Deploy/demo if ready

**Deliverable**: Working authentication system with Google OAuth

---

### Incremental Delivery (Recommended)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP with authentication)
3. Add User Story 2 → Test independently → Deploy/Demo (Token generation working)
4. Seed some test library data manually (using Prisma Studio or SQL)
5. Add User Story 4 → Test independently with seeded data → Deploy/Demo (Library browsing working)
6. Add User Story 3 → Test independently with extension or mock POST → Deploy/Demo (Import working)
7. Add User Story 5 → Test independently → Deploy/Demo (Re-sync working)
8. Add Polish → Final deployment

**Note**: US4 can be developed before US3 by manually seeding test data into the database.

---

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Authentication)
   - Developer B: User Story 2 (Token generation)
   - Developer C: User Story 4 (Library browsing with seeded data)
3. After US1/US2 complete:
   - Developer A: User Story 3 (Import endpoint)
   - Developer B: User Story 5 (Dashboard enhancements)
   - Developer C: Polish tasks

---

## Testing Strategy (Manual for MVP)

Since automated testing is deferred, follow these manual test scenarios:

### User Story 1 Testing
1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Complete OAuth consent
4. Verify redirected to /dashboard
5. Verify user name displayed
6. Click logout, verify redirected to landing page

### User Story 2 Testing
1. Sign in
2. Click "Connect extension" on dashboard
3. Verify new tab opens with https://www.audible.com/lib#token=eyJ...
4. Verify token in URL fragment (not query string)
5. Verify dashboard shows "Waiting for extension" status

### User Story 3 Testing
Use curl or Postman:
```bash
# Get token from /api/sync/token response
curl -X POST http://localhost:3000/api/sync/import \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

Verify:
- Response: `{ success: true, imported: 5, newToCatalog: 5, ... }`
- Database: UserLibrary has 5 entries
- Database: TitleCatalog has 5 titles

### User Story 4 Testing
1. Sign in
2. Navigate to /library
3. Verify titles display (from US3 import or manual seed)
4. Type in search bar
5. Verify results filter in real-time
6. Test with no results, verify empty state

### User Story 5 Testing
1. Complete one sync (US2 + US3)
2. Return to dashboard
3. Verify sync history table shows 1 event
4. Verify stats show correct counts
5. Click "Update library" (should reuse US2 flow)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Extension development deferred to separate task round
- Docker/Postgres setup assumed complete (DATABASE_URL in .env)
- Shared types package deferred (inline types in packages/ui for now)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Use Prisma Studio to manually seed test data for US4 development
