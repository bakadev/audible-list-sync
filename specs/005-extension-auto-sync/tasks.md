# Tasks: Extension Auto-Sync with Manual Upload Fallback

**Input**: Design documents from `/specs/005-extension-auto-sync/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No tests requested in specification - using manual/exploratory testing

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a monorepo project with multiple packages:
- **Extension**: `packages/extension/src/`
- **Web UI**: `packages/ui/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing infrastructure and prepare for feature implementation

- [ ] T001 Verify packages/extension package exists with existing scraper functionality
- [ ] T002 Verify packages/ui has existing `/api/sync/import` endpoint functional
- [ ] T003 [P] Review existing sync token generation logic in packages/ui/src/app/api/sync/token/route.ts
- [ ] T004 [P] Review existing library scraping logic in packages/extension/src/ to understand data structure

**Checkpoint**: Existing infrastructure verified - ready for feature extensions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared logic and utilities needed by multiple user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] Create sync utility module in packages/extension/src/lib/sync.ts with token detection function
- [ ] T006 [P] Add auto-POST function to packages/extension/src/lib/sync.ts with error handling
- [ ] T007 Create shared sync import processing function in packages/ui/src/lib/sync-import.ts (extract from existing endpoint)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automatic Library Sync with Token (Priority: P1) 🎯 MVP

**Goal**: Enable seamless automatic library sync when user is redirected from web app with sync token

**Independent Test**: Click "Update Library" in web app → redirected to Audible with token → extension automatically syncs → library updates without manual steps

### Implementation for User Story 1

- [ ] T008 [P] [US1] Modify packages/extension/src/content.ts to detect sync token from URL on page load
- [ ] T009 [P] [US1] Add auto-sync trigger logic to packages/extension/src/content.ts after scraping completes
- [ ] T010 [US1] Integrate sync.ts token detection into content script workflow in packages/extension/src/content.ts
- [ ] T011 [US1] Integrate sync.ts auto-POST into content script workflow in packages/extension/src/content.ts
- [ ] T012 [P] [US1] Add success UI state to extension showing "Sync Complete!" message with import stats
- [ ] T013 [P] [US1] Add error UI states for network errors, expired token, and API errors in extension
- [ ] T014 [US1] Add "View Library" navigation button to success message linking to web app
- [ ] T015 [US1] Test auto-sync flow end-to-end with valid token from web app redirect

**Checkpoint**: At this point, User Story 1 should be fully functional - users can auto-sync by clicking "Update Library"

---

## Phase 4: User Story 2 - No Token Fallback Message (Priority: P2)

**Goal**: Handle case where user runs extension without going through web app sync flow

**Independent Test**: Navigate directly to Audible (no token) → run extension → see clear message with download/return options

### Implementation for User Story 2

- [ ] T016 [P] [US2] Add no-token detection logic to packages/extension/src/content.ts after scraping
- [ ] T017 [P] [US2] Create fallback UI component in packages/extension/src/ui/popup.ts showing "No sync token found" message
- [ ] T018 [P] [US2] Add explanation text to fallback UI describing options (download JSON or return to app)
- [ ] T019 [P] [US2] Implement "Download JSON" button in packages/extension/src/ui/popup.ts to download scraped library data
- [ ] T020 [P] [US2] Implement "Return to My Audible Lists" button in packages/extension/src/ui/popup.ts to navigate to web app
- [ ] T021 [US2] Integrate fallback UI into content script workflow in packages/extension/src/content.ts
- [ ] T022 [US2] Test no-token fallback flow by navigating directly to Audible and running extension

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - extension handles both token and no-token cases

---

## Phase 5: User Story 3 - Manual JSON Upload in Web Application (Priority: P3)

**Goal**: Provide alternative sync path via manual file upload for users who downloaded JSON from extension

**Independent Test**: Download JSON from extension → navigate to library page → upload file → library updates

### Implementation for User Story 3

- [ ] T023 [P] [US3] Create manual upload component in packages/ui/src/components/library/manual-upload.tsx with file input
- [ ] T024 [P] [US3] Add file validation (type, size) to manual-upload.tsx before upload
- [ ] T025 [P] [US3] Add upload progress UI states (idle, uploading, success, error) to manual-upload.tsx
- [ ] T026 [P] [US3] Create manual upload API route in packages/ui/src/app/api/library/upload/route.ts
- [ ] T027 [US3] Add authentication check to upload route using NextAuth session
- [ ] T028 [US3] Add multipart form data parsing to upload route to extract JSON file
- [ ] T029 [US3] Add file size validation (max 5MB) to upload route
- [ ] T030 [US3] Add JSON structure validation to upload route (validate titles array and required fields)
- [ ] T031 [US3] Call shared sync import processing function from upload route with parsed data
- [ ] T032 [US3] Return import stats response (imported, newToCatalog, warnings) from upload route
- [ ] T033 [US3] Integrate manual-upload.tsx component into packages/ui/src/app/(authenticated)/library/page.tsx
- [ ] T034 [US3] Add upload button and help text to library page
- [ ] T035 [US3] Connect upload success handler to refresh library display on library page
- [ ] T036 [US3] Test manual upload flow with valid JSON file from extension
- [ ] T037 [US3] Test manual upload error handling (invalid file, malformed JSON, file too large)

**Checkpoint**: All user stories should now be independently functional - extension auto-sync, fallback message, and manual upload all work

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements, error handling improvements, and documentation

- [ ] T038 [P] Add rate limiting consideration documentation for extension API calls
- [ ] T039 [P] Add user-facing error messages documentation for all error scenarios
- [ ] T040 [P] Verify extension manifest permissions include Audible.com host permission
- [ ] T041 [P] Verify CORS configuration in packages/ui API routes allows extension origin
- [ ] T042 [P] Add console logging for debugging token detection in extension
- [ ] T043 Test all three user stories end-to-end in sequence
- [ ] T044 Document testing scenarios in quickstart.md for each user story
- [ ] T045 Create user guide for extension installation and first sync
- [ ] T046 [P] Review and update extension manifest.json version number
- [ ] T047 [P] Review and update web app package.json version if needed

**Final Checkpoint**: Feature complete and ready for user testing

---

## Dependencies & Execution Order

### User Story Dependencies

```
Setup (Phase 1)
    ↓
Foundational (Phase 2: shared utilities)
    ↓
┌─────────────┬─────────────┬─────────────┐
│   US1 (P1)  │   US2 (P2)  │   US3 (P3)  │
│   MVP       │  Fallback   │   Manual    │
│ Auto-Sync   │   Message   │   Upload    │
└─────────────┴─────────────┴─────────────┘
    ↓           ↓               ↓
    └──────────┬────────────────┘
               ↓
         Polish (Phase 6)
```

**Notes**:
- User Stories 1, 2, and 3 can be implemented in parallel after Phase 2
- US1 is the MVP - prioritize for quickest value delivery
- US2 and US3 enhance UX but don't block US1

### Task-Level Dependencies

**Phase 3 (US1) Dependencies**:
- T010 depends on T005 (token detection function)
- T011 depends on T006 (auto-POST function)
- T014 depends on T012 (success UI must exist before adding navigation)

**Phase 4 (US2) Dependencies**:
- T021 depends on T016-T020 (all UI components must exist before integration)

**Phase 5 (US3) Dependencies**:
- T027 depends on T007 (shared sync import function)
- T031 depends on T007 (shared sync import function)
- T033 depends on T023 (component must exist before integration)
- T035 depends on T033 (integration must happen before connecting handlers)

---

## Parallel Execution Examples

### Phase 2: Foundational

```bash
# All foundational tasks can run in parallel
parallel:
  - T005: Create sync.ts module
  - T006: Add auto-POST to sync.ts
  - T007: Extract shared sync import logic
```

### Phase 3: User Story 1

```bash
# Extension modifications (can run in parallel)
parallel:
  - T008: Token detection in content.ts
  - T009: Auto-sync trigger in content.ts
  - T012: Success UI
  - T013: Error UI states

# Then integrate (must be sequential after above)
sequential:
  - T010: Integrate token detection
  - T011: Integrate auto-POST
  - T014: Add navigation button
  - T015: End-to-end test
```

### Phase 4: User Story 2

```bash
# UI components (can run in parallel)
parallel:
  - T016: No-token detection
  - T017: Fallback UI component
  - T018: Explanation text
  - T019: Download button
  - T020: Return button

# Then integrate
sequential:
  - T021: Integrate fallback UI
  - T022: Test no-token flow
```

### Phase 5: User Story 3

```bash
# Frontend and backend (can run in parallel)
parallel_group_1:
  - T023: Manual upload component UI
  - T024: File validation
  - T025: Upload progress states

parallel_group_2:
  - T026: Upload API route skeleton
  - T028: Form data parsing
  - T029: File size validation
  - T030: JSON validation

# Auth and integration (sequential dependencies)
sequential:
  - T027: Add auth check (depends on T026)
  - T031: Call shared sync logic (depends on T007, T026)
  - T032: Return response (depends on T031)
  - T033: Integrate component (depends on T023)
  - T034: Add UI to library page (depends on T033)
  - T035: Connect handlers (depends on T034)
  - T036: Test valid flow
  - T037: Test error scenarios
```

---

## Implementation Strategy

### MVP Delivery (Fastest Path to Value)

**Phase 1** → **Phase 2** → **Phase 3 (US1)** → Basic functionality ready

This gives users the core auto-sync feature in the shortest time. Estimated: 8-12 tasks.

### Full Feature Delivery

**Phase 1** → **Phase 2** → **Phases 3, 4, 5** (in parallel) → **Phase 6**

All user stories completed with fallback mechanisms. Estimated: 47 tasks total.

### Incremental Rollout

1. **Week 1**: MVP (Phases 1-3) - Auto-sync working
2. **Week 2**: Add US2 (Phase 4) - Fallback message
3. **Week 3**: Add US3 (Phase 5) - Manual upload
4. **Week 4**: Polish (Phase 6) - Final testing and docs

---

## Task Summary

- **Total Tasks**: 47
- **Setup Tasks**: 4 (Phase 1)
- **Foundational Tasks**: 3 (Phase 2)
- **US1 Tasks**: 8 (Phase 3) - MVP
- **US2 Tasks**: 7 (Phase 4)
- **US3 Tasks**: 15 (Phase 5)
- **Polish Tasks**: 10 (Phase 6)

**Parallel Opportunities**: 28 tasks can run in parallel (marked with [P])
**Sequential Tasks**: 19 tasks have dependencies and must run in order

**MVP Scope**: Phases 1-3 (15 tasks) - Delivers core auto-sync functionality
**Full Scope**: All phases (47 tasks) - Delivers complete feature with all fallback mechanisms

---

## Independent Test Criteria Per Story

### User Story 1 (Auto-Sync)
✅ User clicks "Update Library" button in web app
✅ User is redirected to Audible with token in URL
✅ Extension automatically detects token and syncs
✅ Library updates without manual intervention
✅ Success message shows import stats

### User Story 2 (Fallback Message)
✅ User navigates directly to Audible (no token)
✅ Extension shows "No sync token found" message
✅ User can download JSON or return to app
✅ Downloaded JSON has valid structure

### User Story 3 (Manual Upload)
✅ User can select JSON file on library page
✅ Upload processes file and creates library entries
✅ Success message shows import stats
✅ Library display refreshes with new titles
✅ Invalid files show clear error messages

---

## Notes

- No database schema changes required (using existing tables)
- Reuses existing `/api/sync/import` validation and processing logic
- Extension changes are isolated to specific files (minimal blast radius)
- Web app changes are isolated to library page and new upload route
- All three user stories are independently testable and deployable
- MVP (US1) can ship first, US2 and US3 can follow incrementally
