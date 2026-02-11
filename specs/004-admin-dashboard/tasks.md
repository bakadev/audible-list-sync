---
description: "Task list for Admin Dashboard & Data Import feature"
---

# Tasks: Admin Dashboard & Data Import

**Input**: Design documents from `/specs/004-admin-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No automated tests requested in spec - manual testing via quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=Import, US2=Access, US3=Users, US4=Titles, US5=Cleanup)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**: `packages/ui/` contains Next.js 19 web application
- **API routes**: `packages/ui/src/app/api/admin/`
- **Admin pages**: `packages/ui/src/app/(authenticated)/admin/`
- **Shared utilities**: `packages/ui/src/lib/`
- **Database schema**: `packages/ui/prisma/schema.prisma`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and documentation review

- [X] T001 Review spec.md user stories and acceptance criteria in /Users/traviswilson/Development/my-audible-lists/specs/004-admin-dashboard/spec.md
- [X] T002 Review plan.md tech stack (Next.js 19, React 19, Prisma, NextAuth) in /Users/traviswilson/Development/my-audible-lists/specs/004-admin-dashboard/plan.md
- [X] T003 [P] Review data-model.md entities and relationships in /Users/traviswilson/Development/my-audible-lists/specs/004-admin-dashboard/data-model.md
- [X] T004 [P] Review research.md implementation decisions (Audnex API, Prisma patterns) in /Users/traviswilson/Development/my-audible-lists/specs/004-admin-dashboard/research.md
- [X] T005 [P] Review contracts/ API specifications in /Users/traviswilson/Development/my-audible-lists/specs/004-admin-dashboard/contracts/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema & Migrations

- [X] T006 Add isAdmin boolean field to User model in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T007 [P] Create Title model with ASIN primary key in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T008 [P] Create Author model with ASIN and name fields in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T009 [P] Create Narrator model with id (cuid) and unique name in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T010 [P] Create Genre model with ASIN, name, and type (genre/tag) in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T011 [P] Create Series model with ASIN and name in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T012 [P] Create AuthorOnTitle join table with composite primary key in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T013 [P] Create NarratorOnTitle join table with composite primary key in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T014 Create LibraryEntry model with userId, titleAsin foreign keys and unique constraint in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T015 Create SyncHistory model for import audit logging in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T016 Add indexes for performance (User.email, Title.title, LibraryEntry composite, etc.) in /Users/traviswilson/Development/my-audible-lists/packages/ui/prisma/schema.prisma
- [X] T017 Generate Prisma migration with name "add_title_catalog" in /Users/traviswilson/Development/my-audible-lists/packages/ui/
- [X] T018 Run migration to apply database schema changes in /Users/traviswilson/Development/my-audible-lists/packages/ui/

### Shared Utilities & Infrastructure

- [X] T019 Create Audnex API client with fetchTitleMetadata function in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/lib/audnex.ts
- [X] T020 Add exponential backoff retry logic (3 retries, 1s/2s/4s) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/lib/audnex.ts
- [X] T021 Add error handling for rate limits (429) and server errors (5xx) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/lib/audnex.ts
- [X] T022 Create admin auth utility with isAdmin type guard function in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/lib/admin-auth.ts
- [X] T023 Create requireAdmin function that throws on unauthorized access in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/lib/admin-auth.ts
- [X] T024 Update middleware.ts to add admin route protection for /admin paths in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/middleware.ts
- [X] T025 Add redirect to /library for non-admin users attempting /admin access in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/middleware.ts
- [X] T026 Add redirect to /api/auth/signin for unauthenticated /admin access in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/middleware.ts
- [ ] T027 Update NextAuth callbacks to auto-assign isAdmin on login if email matches ADMIN_EMAIL env var in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/lib/auth.ts
- [ ] T028 Add isAdmin field to session object in NextAuth session callback in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/lib/auth.ts
- [X] T029 Add ADMIN_EMAIL environment variable to .env.example in /Users/traviswilson/Development/my-audible-lists/packages/ui/.env.example

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Import Extension Data (Priority: P1) 🎯 MVP

**Goal**: Enable users to import library data from Chrome extension JSON output into platform database

**Independent Test**: POST extension JSON to /api/admin/import endpoint, verify titles appear in database with correct metadata and user-specific data

### Implementation for User Story 1

#### Core Import Logic

- [X] T030 [US1] Create import route handler stub (POST /api/admin/import) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T031 [US1] Add authentication check using getServerSession in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T032 [US1] Add request body validation against extension output schema in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T033 [US1] Implement import summary tracking (totalCount, successCount, failureCount, errors array) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts

#### Title Processing & Audnex Integration

- [X] T034 [US1] Implement titleCatalog loop processing each extension title in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T035 [US1] Check if Title exists in database by ASIN (Prisma findUnique) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T036 [US1] Call fetchTitleMetadata from Audnex API if Title not found in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T037 [US1] Handle Audnex API failures gracefully (log error, skip title, continue processing) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts

#### Database Upsert Operations

- [X] T038 [US1] Create or update Title record from Audnex data using Prisma upsert in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T039 [US1] Upsert Author records and create AuthorOnTitle join records in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T040 [US1] Upsert Narrator records (by name uniqueness) and create NarratorOnTitle join records in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T041 [US1] Upsert Genre records and link to Title via implicit many-to-many in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T042 [US1] Upsert Series record and set Title.seriesAsin if seriesPrimary exists in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T043 [US1] Create or update LibraryEntry with user-specific data (rating, status, progress, timeLeft, source) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T044 [US1] Use unique constraint (userId, titleAsin) to prevent duplicate library entries in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts

#### Transaction Handling & Audit Logging

- [X] T045 [US1] Wrap each title import in Prisma transaction for atomicity in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T046 [US1] Create SyncHistory record after import completes with summary stats in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T047 [US1] Calculate durationMs (import processing time) for SyncHistory in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T048 [US1] Set status (success/partial/failed) based on successCount and failureCount in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T049 [US1] Store errors array in SyncHistory with ASIN, title, and error message in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts

#### Response & Error Handling

- [X] T050 [US1] Return ImportResponse with success flag, summary, and errors array in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T051 [US1] Add 400 Bad Request error handling for invalid JSON schema in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T052 [US1] Add 401 Unauthorized error handling for missing authentication in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T053 [US1] Add 500 Internal Server Error handling for database failures in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts

**Checkpoint**: At this point, User Story 1 (Import) should be fully functional via curl testing (see quickstart.md)

---

## Phase 4: User Story 2 - Admin Access Control (Priority: P2)

**Goal**: Establish security foundation with automatic admin role assignment and route protection

**Independent Test**: Log in as admin user (matching ADMIN_EMAIL), verify access to /admin routes. Log in as non-admin, verify redirect to /library

### Implementation for User Story 2

#### Admin Dashboard UI

- [X] T054 [US2] Create admin layout with auth guard checking isAdmin flag in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/layout.tsx
- [X] T055 [US2] Add redirect to /library for non-admin users in admin layout in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/layout.tsx
- [X] T056 [US2] Create admin navigation component with links to Users and Titles pages in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/layout.tsx
- [X] T057 [US2] Create admin dashboard home page with overview stats in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/page.tsx
- [X] T058 [US2] Display total users count on admin dashboard in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/page.tsx
- [X] T059 [US2] Display total titles count on admin dashboard in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/page.tsx
- [X] T060 [US2] Display recent import operations list (last 10) on admin dashboard in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/page.tsx

#### Session & Environment Setup

- [X] T061 [US2] Update TypeScript types to include isAdmin on User and Session types in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/types/next-auth.d.ts
- [X] T062 [US2] Test admin auto-assignment by logging in with email matching ADMIN_EMAIL env var in /Users/traviswilson/Development/my-audible-lists/packages/ui/
- [X] T063 [US2] Test non-admin user redirect when attempting to access /admin routes in /Users/traviswilson/Development/my-audible-lists/packages/ui/
- [X] T064 [US2] Test unauthenticated user redirect to /api/auth/signin when accessing /admin in /Users/traviswilson/Development/my-audible-lists/packages/ui/

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently (import + access control)

---

## Phase 5: User Story 3 - User Library Management (Priority: P3)

**Goal**: Enable admin oversight and troubleshooting through user library viewing and management

**Independent Test**: Access /admin/users, verify user list displays. Click user, verify library displays. Use "Drop User Library" button, verify deletion

### Implementation for User Story 3

#### Users List API

- [X] T065 [P] [US3] Create GET /api/admin/users route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/route.ts
- [X] T066 [US3] Add authentication and admin role check in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/route.ts
- [X] T067 [US3] Implement pagination (page, limit params, default 50 per page) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/route.ts
- [X] T068 [US3] Implement search filtering by email or name (case-insensitive) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/route.ts
- [X] T069 [US3] Implement sorting by email, name, libraryCount, or createdAt in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/route.ts
- [X] T070 [US3] Aggregate library counts (libraryCount, wishlistCount) using Prisma count in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/route.ts
- [X] T071 [US3] Get lastImportAt from most recent SyncHistory record per user in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/route.ts
- [X] T072 [US3] Return UserListResponse with users array and pagination metadata in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/route.ts

#### User Details API

- [X] T073 [P] [US3] Create GET /api/admin/users/[userId] route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts
- [X] T074 [US3] Add authentication and admin role check in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts
- [X] T075 [US3] Fetch user by userId with 404 error if not found in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts
- [X] T076 [US3] Fetch user's full library with LibraryEntry records in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts
- [X] T077 [US3] Include Title metadata with authors, narrators, genres, series in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts
- [X] T078 [US3] Implement source filter (LIBRARY/WISHLIST query param) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts
- [X] T079 [US3] Implement status filter (Finished/In Progress/Not Started query param) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts
- [X] T080 [US3] Calculate LibrarySummary with counts by source and status in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts
- [X] T081 [US3] Return UserDetailsResponse with user, library, and summary in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts

#### Drop User Library API

- [X] T082 [P] [US3] Create DELETE /api/admin/users/[userId]/library route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/library/route.ts
- [X] T083 [US3] Add authentication and admin role check in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/library/route.ts
- [X] T084 [US3] Validate confirmation query param (must be "true") in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/library/route.ts
- [X] T085 [US3] Delete all LibraryEntry records for userId using Prisma deleteMany in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/library/route.ts
- [X] T086 [US3] Return DropLibraryResponse with deletedCount and success message in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/library/route.ts
- [X] T087 [US3] Add 400 Bad Request if confirmation param missing in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/library/route.ts

#### Users Management UI

- [X] T088 [US3] Create users list page component in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/users/page.tsx
- [X] T089 [US3] Fetch users from GET /api/admin/users with pagination in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/users/page.tsx
- [X] T090 [US3] Create UsersTable component displaying email, name, library counts, lastImportAt in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/users-table.tsx
- [X] T091 [US3] Add search input filtering users by email/name in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/users-table.tsx
- [X] T092 [US3] Add sorting controls (email, libraryCount, createdAt) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/users-table.tsx
- [X] T093 [US3] Add pagination controls (prev/next, page number) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/users-table.tsx
- [X] T094 [US3] Add click handler to navigate to user detail page in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/users-table.tsx

#### User Detail UI

- [X] T095 [US3] Create user detail page component in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/users/[userId]/page.tsx
- [X] T096 [US3] Fetch user details from GET /api/admin/users/[userId] in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/users/[userId]/page.tsx
- [X] T097 [US3] Display user info (email, name, isAdmin, createdAt) at top of page in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/users/[userId]/page.tsx
- [X] T098 [US3] Display library summary stats (total, library, wishlist, by status) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/users/[userId]/page.tsx
- [X] T099 [US3] Create UserLibraryTable component showing all library entries in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/user-library-table.tsx
- [X] T100 [US3] Display title, ASIN, authors, narrators, userRating, status, progress in table in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/user-library-table.tsx
- [X] T101 [US3] Add filter tabs for source (All, Library, Wishlist) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/user-library-table.tsx
- [X] T102 [US3] Add filter buttons for status (All, Finished, In Progress, Not Started) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/user-library-table.tsx
- [X] T103 [US3] Create DangerZone component with "Drop User Library" button in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/danger-zone.tsx
- [X] T104 [US3] Add confirmation dialog before dropping user library in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/danger-zone.tsx
- [X] T105 [US3] Call DELETE /api/admin/users/[userId]/library?confirm=true on confirmation in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/danger-zone.tsx
- [X] T106 [US3] Display success message and refresh page after drop in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/danger-zone.tsx

**Checkpoint**: All user stories 1-3 should now be independently functional (import + access + user management)

---

## Phase 6: User Story 4 - Title Metadata Management (Priority: P4)

**Goal**: Enable data quality maintenance through title viewing, editing, and refreshing from Audnex API

**Independent Test**: Access /admin/titles, search for title by ASIN. Edit metadata fields. Verify changes persist and appear in user libraries

### Implementation for User Story 4

#### Titles List API

- [X] T107 [P] [US4] Create GET /api/admin/titles route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T108 [US4] Add authentication and admin role check in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T109 [US4] Implement pagination (page, limit params, default 50 per page) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T110 [US4] Implement search filtering by title, author name, narrator name in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T111 [US4] Implement genre filter by genre ASIN query param in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T112 [US4] Implement series filter by series ASIN query param in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T113 [US4] Implement sorting by title, releaseDate, rating, userCount, createdAt in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T114 [US4] Flatten author and narrator names into arrays for display in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T115 [US4] Calculate userCount (number of users with this title) using Prisma count in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T116 [US4] Return TitleListResponse with titles array and pagination metadata in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts

#### Title Details API

- [X] T117 [P] [US4] Create GET /api/admin/titles/[asin] route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T118 [US4] Add authentication and admin role check in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T119 [US4] Fetch title by ASIN with 404 error if not found in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T120 [US4] Include all relations (authors, narrators, genres, series) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T121 [US4] Calculate TitleUsageStats (totalUsers, libraryCount, wishlistCount, averageRating, finishedCount) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T122 [US4] Return TitleDetailsResponse with title and usageStats in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts

#### Update Title API

- [X] T123 [P] [US4] Create PUT /api/admin/titles/[asin] route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T124 [US4] Add authentication and admin role check in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T125 [US4] Validate request body against UpdateTitleRequest schema in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T126 [US4] Validate seriesAsin references existing Series if provided in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T127 [US4] Update Title record with Prisma update (only provided fields) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts
- [X] T128 [US4] Return updated TitleDetailsResponse after successful update in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/route.ts

#### Refresh Title from Audnex API

- [X] T129 [P] [US4] Create POST /api/admin/titles/[asin]/refresh route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/refresh/route.ts
- [X] T130 [US4] Add authentication and admin role check in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/refresh/route.ts
- [X] T131 [US4] Fetch title metadata from Audnex API using fetchTitleMetadata in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/refresh/route.ts
- [X] T132 [US4] Handle Audnex API errors with 502 Bad Gateway response in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/refresh/route.ts
- [X] T133 [US4] Compare fetched data with existing title to determine updatedFields array in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/refresh/route.ts
- [X] T134 [US4] Update Title record and relations (authors, narrators, genres, series) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/refresh/route.ts
- [X] T135 [US4] Return RefreshTitleResponse with updatedFields and timestamp in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/[asin]/refresh/route.ts

#### Titles Management UI

- [X] T136 [US4] Create titles list page component in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/page.tsx
- [X] T137 [US4] Fetch titles from GET /api/admin/titles with pagination in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/page.tsx
- [X] T138 [US4] Create TitlesTable component displaying ASIN, title, authors, narrators, rating, userCount in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/titles-table.tsx
- [X] T139 [US4] Add search input filtering titles by title/author/narrator name in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/titles-table.tsx
- [X] T140 [US4] Add sorting controls (title, releaseDate, rating, userCount) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/titles-table.tsx
- [X] T141 [US4] Add pagination controls (prev/next, page number) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/titles-table.tsx
- [X] T142 [US4] Add click handler to navigate to title detail page in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/titles-table.tsx

#### Title Detail & Edit UI

- [X] T143 [US4] Create title detail page component in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/[asin]/page.tsx
- [X] T144 [US4] Fetch title details from GET /api/admin/titles/[asin] in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/[asin]/page.tsx
- [X] T145 [US4] Display title metadata (ASIN, title, subtitle, description, cover image, rating) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/[asin]/page.tsx
- [X] T146 [US4] Display authors, narrators, genres, series information in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/[asin]/page.tsx
- [X] T147 [US4] Display usage stats (totalUsers, averageRating, finishedCount) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/[asin]/page.tsx
- [X] T148 [US4] Create TitleEditForm component with editable metadata fields in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/title-edit-form.tsx
- [X] T149 [US4] Add input fields for title, subtitle, description, summary in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/title-edit-form.tsx
- [X] T150 [US4] Add input fields for runtimeLengthMin, image URL, rating, releaseDate in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/title-edit-form.tsx
- [X] T151 [US4] Add input fields for publisherName, isbn, language, region in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/title-edit-form.tsx
- [X] T152 [US4] Add series selection dropdown and seriesPosition input in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/title-edit-form.tsx
- [X] T153 [US4] Call PUT /api/admin/titles/[asin] on form submit in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/title-edit-form.tsx
- [X] T154 [US4] Display success message and updated data after save in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/title-edit-form.tsx
- [X] T155 [US4] Add "Refresh from Audnex" button calling POST /api/admin/titles/[asin]/refresh in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/[asin]/page.tsx
- [X] T156 [US4] Display updatedFields list after successful Audnex refresh in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/[asin]/page.tsx

**Checkpoint**: All user stories 1-4 should now be independently functional (import + access + users + titles)

---

## Phase 7: User Story 5 - Database Cleanup Operations (Priority: P5)

**Goal**: Provide destructive operations for development and testing (drop all titles)

**Independent Test**: Click "Drop All Titles", verify all title records deleted and user libraries empty. Verify subsequent import repopulates database

### Implementation for User Story 5

#### Drop All Titles API

- [X] T157 [US5] Add DELETE handler to /api/admin/titles route in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T158 [US5] Add authentication and admin role check in DELETE handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T159 [US5] Validate confirmation query param (must be "DELETE_ALL_TITLES") in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T160 [US5] Count titles before deletion for response in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T161 [US5] Delete all Title records using Prisma deleteMany (cascades to join tables) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T162 [US5] Return DropTitlesResponse with deletedCount and success message in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts
- [X] T163 [US5] Add 400 Bad Request if confirmation param missing or incorrect in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/titles/route.ts

#### Drop All Titles UI

- [X] T164 [US5] Add "Drop All Titles" button to DangerZone component in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/danger-zone.tsx
- [X] T165 [US5] Add confirmation dialog requiring user to type "DELETE_ALL_TITLES" in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/danger-zone.tsx
- [X] T166 [US5] Call DELETE /api/admin/titles?confirm=DELETE_ALL_TITLES on confirmation in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/danger-zone.tsx
- [X] T167 [US5] Display deletedCount and success message after drop in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/danger-zone.tsx
- [X] T168 [US5] Add warning text explaining operation is irreversible in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/danger-zone.tsx
- [X] T169 [US5] Place "Drop All Titles" button on titles list page in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/titles/page.tsx

**Checkpoint**: All user stories 1-5 should now be independently functional (full feature complete)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T170 [P] Add loading skeletons for admin pages during data fetch in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/
- [X] T171 [P] Add error boundary components for admin routes in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/(authenticated)/admin/error.tsx
- [X] T172 [P] Add toast notifications for success/error messages across admin UI in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/
- [X] T173 Update quickstart.md with manual test scenarios for all 5 user stories in /Users/traviswilson/Development/my-audible-lists/specs/004-admin-dashboard/quickstart.md
- [X] T174 Add curl command examples for testing import endpoint in /Users/traviswilson/Development/my-audible-lists/specs/004-admin-dashboard/quickstart.md
- [X] T175 Add curl command examples for testing admin API endpoints in /Users/traviswilson/Development/my-audible-lists/specs/004-admin-dashboard/quickstart.md
- [X] T176 [P] Add API response time logging for import endpoint in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts
- [X] T177 [P] Add Audnex API call tracking (success rate, error rate) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/lib/audnex.ts
- [X] T178 Review all admin routes for consistent error handling patterns in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/
- [X] T179 Review all admin UI components for accessibility (keyboard nav, screen readers) in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/components/admin/
- [X] T180 Run quickstart.md validation scenarios for all user stories in /Users/traviswilson/Development/my-audible-lists/specs/004-admin-dashboard/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Import)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Core MVP feature that enables all others
  - Requires: Database schema, Audnex API client, admin auth utilities

- **User Story 2 (P2 - Access Control)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Security foundation that should be in place before exposing admin features
  - Requires: Admin role in User model, middleware protection, NextAuth callbacks

- **User Story 3 (P3 - User Management)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
  - Requires: LibraryEntry and SyncHistory tables from US1
  - Can display imported data but doesn't block US1 testing

- **User Story 4 (P4 - Title Management)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
  - Requires: Title catalog tables from US1
  - Can display and edit imported titles but doesn't block US1 testing

- **User Story 5 (P5 - Cleanup)**: Can start after Foundational (Phase 2) - Depends on US1 for testing
  - Destructive operations for dev/test utility
  - Best tested after US1 imports data to delete

### Within Each User Story

**User Story 1 (Import)**:
1. T030-T033: Route handler structure and validation (can start immediately)
2. T034-T037: Title processing and Audnex integration (depends on T019-T021 Audnex client)
3. T038-T044: Database upsert operations (can run in parallel, all depend on T017-T018 migration)
4. T045-T049: Transaction and audit logging (depends on T038-T044 completing)
5. T050-T053: Response and error handling (depends on all above)

**User Story 2 (Access Control)**:
1. T054-T060: Admin dashboard UI (can start after T024-T026 middleware)
2. T061-T064: Testing and validation (depends on T027-T029 NextAuth callbacks)

**User Story 3 (User Management)**:
1. T065-T072: Users list API (can start immediately)
2. T073-T081: User details API (can run parallel with T065-T072)
3. T082-T087: Drop user library API (can run parallel with T065-T081)
4. T088-T094: Users list UI (depends on T065-T072 API)
5. T095-T106: User detail UI (depends on T073-T087 APIs)

**User Story 4 (Title Management)**:
1. T107-T116: Titles list API (can start immediately)
2. T117-T122: Title details API (can run parallel with T107-T116)
3. T123-T128: Update title API (can run parallel with T107-T122)
4. T129-T135: Refresh title API (can run parallel with T107-T128)
5. T136-T142: Titles list UI (depends on T107-T116 API)
6. T143-T156: Title detail UI (depends on T117-T135 APIs)

**User Story 5 (Cleanup)**:
1. T157-T163: Drop all titles API (can start immediately)
2. T164-T169: Drop all titles UI (depends on T157-T163 API)

### Parallel Opportunities

- **Foundational Phase**: T007-T013 (models) can run in parallel
- **US1 Import**: T038-T042 (upsert operations) can run in parallel
- **US3 Users**: T065-T087 (all three API endpoints) can run in parallel
- **US4 Titles**: T107-T135 (all four API endpoints) can run in parallel
- **Polish Phase**: T170-T172, T176-T177 (cross-cutting concerns) can run in parallel

- Once Foundational phase completes, **all user stories can start in parallel** (if team capacity allows)
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1 (Import)

```bash
# After Foundational phase complete, launch all upsert operations together:
Task: "Create or update Title record from Audnex data using Prisma upsert in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts"
Task: "Upsert Author records and create AuthorOnTitle join records in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts"
Task: "Upsert Narrator records (by name uniqueness) and create NarratorOnTitle join records in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts"
Task: "Upsert Genre records and link to Title via implicit many-to-many in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts"
Task: "Upsert Series record and set Title.seriesAsin if seriesPrimary exists in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/import/route.ts"
```

---

## Parallel Example: User Story 3 (User Management)

```bash
# After Foundational phase complete, launch all API endpoints together:
Task: "Create GET /api/admin/users route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/route.ts"
Task: "Create GET /api/admin/users/[userId] route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/route.ts"
Task: "Create DELETE /api/admin/users/[userId]/library route handler in /Users/traviswilson/Development/my-audible-lists/packages/ui/src/app/api/admin/users/[userId]/library/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Import Extension Data)
4. **STOP and VALIDATE**: Test User Story 1 independently via curl (see quickstart.md)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Import) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Access Control) → Test independently → Deploy/Demo
4. Add User Story 3 (User Management) → Test independently → Deploy/Demo
5. Add User Story 4 (Title Management) → Test independently → Deploy/Demo
6. Add User Story 5 (Cleanup) → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Import - critical path MVP)
   - Developer B: User Story 2 (Access Control - security foundation)
   - Developer C: User Story 3 (User Management - admin oversight)
3. Stories complete and integrate independently
4. Remaining stories (US4, US5) can be added incrementally

---

## Notes

- **[P] tasks** = different files, no dependencies, safe to parallelize
- **[Story] label** maps task to specific user story for traceability
- **Each user story** should be independently completable and testable via curl or browser
- **Commit often**: After each task or logical group of related tasks
- **Stop at checkpoints**: Validate story independently before moving to next priority
- **Manual testing**: Use quickstart.md scenarios (no automated tests requested)
- **Performance goal**: <30s import for 100+ titles (excluding Audnex API time)
- **Security note**: Admin operations are powerful - verify access controls thoroughly
- **Production considerations**: Add confirmation dialogs, soft deletes, audit logging before production deployment
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence
