# Tasks: Audible Library Extension

**Input**: Design documents from `/specs/002-audible-extension/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/extension-output.schema.json, quickstart.md

**Tests**: No test tasks included (not requested in specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths relative to `packages/extension/` directory:
- Extension configuration: `manifest.json`
- Entry points: `content-script.js`, `overlay-ui.js`
- Scrapers: `scraper/library-scraper.js`, `scraper/store-scraper.js`, `scraper/wishlist-scraper.js`, `scraper/metadata-extractor.js`
- Utilities: `utils/rate-limiter.js`, `utils/retry-handler.js`, `utils/storage-manager.js`, `utils/json-normalizer.js`, `utils/token-detector.js`
- Assets: `icons/`, `styles/overlay.css`

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create extension package structure and basic configuration

- [X] T001 Create packages/extension/ directory structure with scraper/, utils/, icons/, styles/ subdirectories
- [X] T002 Create manifest.json with Manifest V3 configuration, permissions (activeTab, storage, host_permissions for *.audible.com), content_scripts for audible.com/library* and audible.com/wl*
- [X] T003 [P] Create extension icons (icon16.png, icon48.png, icon128.png) in icons/ directory
- [X] T004 [P] Create PURPOSE.md documenting package scope and responsibilities
- [X] T005 [P] Create README.md with installation instructions (load unpacked extension in developer mode)
- [X] T006 [P] Create styles/overlay.css with base overlay positioning (bottom-right corner, collapsible, z-index)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Implement chrome.storage.local wrapper in utils/storage-manager.js with methods for saving/loading progress, sync sessions, and token storage
- [X] T008 [P] Implement rate limiter with promise queue in utils/rate-limiter.js (default 10 req/sec, configurable 1-20 req/sec)
- [X] T009 [P] Implement retry handler with exponential backoff in utils/retry-handler.js (3 retries with 1s, 2s, 4s delays)
- [X] T010 [P] Implement metadata extractor base functions in scraper/metadata-extractor.js (JSON-LD parser, DOM selector fallbacks, field validation)
- [X] T011 Implement JSON normalizer in utils/json-normalizer.js (title catalog + user library separation, ASIN deduplication, type coercion per data-model.md)
- [X] T012 [P] Create React overlay base component in overlay-ui.js (load React 19 from CDN, render in shadow DOM for style isolation, collapsible panel)
- [X] T013 Create content script entry point in content-script.js (inject on audible.com/library* and audible.com/wl*, initialize overlay, coordinate scraping workflow)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Library Scraping and JSON Export (P1) 🎯 MVP

**Goal**: Enable users to scrape their Audible library, extract comprehensive metadata for all titles, and download complete dataset as JSON file

**Independent Test**: Install extension, visit audible.com/library, click "Start Sync", verify JSON file downloads with all library titles and metadata fields matching contracts/extension-output.schema.json

### Implementation for User Story 1

- [X] T014 [P] [US1] Implement library page pagination detection in scraper/library-scraper.js (parse "1-X of Y results" text, generate page URLs with ?page=N&pageSize=50)
- [X] T015 [P] [US1] Implement library page basic metadata extraction in scraper/library-scraper.js (ASIN from data-asin, title, authors, narrators, cover URL, series info from DOM per research.md selectors)
- [X] T016 [US1] Implement store page detailed metadata scraping in scraper/store-scraper.js (fetch audible.com/pd/ASIN, parse JSON-LD blocks for duration/rating/summary/categories, DOM fallback for subtitle/publisher)
- [X] T017 [US1] Integrate library scraper with rate limiter (throttle store page fetches) and retry handler (3-attempt exponential backoff) in scraper/library-scraper.js
- [X] T018 [US1] Implement progress tracking and state management in content-script.js (save to storage every 10 titles, track current page, titles scraped, errors)
- [X] T019 [US1] Add "Start Sync" button, progress bar, and status text to overlay UI in overlay-ui.js (displays "Scraping library page X of Y", "Scraped N of M titles", estimated time remaining)
- [X] T020 [US1] Add "Download JSON" button to overlay UI in overlay-ui.js (appears when scraping complete, triggers browser download with filename audible-library-YYYY-MM-DD.json)
- [X] T021 [US1] Integrate library-only scraping workflow in content-script.js (library pagination → store page details → JSON normalization → storage → download)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can export complete library data as JSON

---

## Phase 4: User Story 2 - Wishlist Scraping (P2)

**Goal**: Extend scraping to include wishlist titles, flagged with source: "WISHLIST" in exported data

**Independent Test**: Visit audible.com/wl (wishlist), activate extension, verify JSON output includes wishlist entries with source: "WISHLIST" and library entries with source: "LIBRARY"

### Implementation for User Story 2

- [X] T022 [P] [US2] Implement wishlist page pagination and scraping in scraper/wishlist-scraper.js (reuse library-scraper.js pagination logic, extract same basic metadata)
- [X] T023 [US2] Add wishlist navigation logic to content-script.js (after library complete, programmatically fetch audible.com/wl, detect 403/404 if unavailable)
- [X] T024 [US2] Update JSON normalizer in utils/json-normalizer.js to flag entries with source: "LIBRARY" or "WISHLIST", apply library precedence for duplicates
- [X] T025 [US2] Update overlay UI in overlay-ui.js to show wishlist scraping phase ("Scraping wishlist page X of Y") and final summary with library vs wishlist counts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can export library + wishlist in single operation

---

## Phase 5: User Story 3 - Rate Limiting and Respectful Scraping (P2)

**Goal**: Provide configurable rate limiting to prevent overloading Audible servers, with visible rate status

**Independent Test**: Monitor network requests during scrape (Chrome DevTools → Network tab), verify requests occur at configured rate (default 10/sec), no burst patterns

### Implementation for User Story 3

- [ ] T026 [US3] Add rate limit configuration UI to overlay in overlay-ui.js (settings panel with slider 1-20 req/sec, save to chrome.storage.local)
- [ ] T027 [US3] Update rate limiter in utils/rate-limiter.js to read configurable rate from storage, dynamically adjust delay between requests
- [ ] T028 [US3] Add rate limit status display to overlay UI in overlay-ui.js (show current rate "Throttling at 10 req/sec", time between requests)

**Checkpoint**: At this point, all user stories 1-3 work - users can configure scraping speed

---

## Phase 6: User Story 4 - Error Handling and Recovery (P2)

**Goal**: Gracefully handle authentication errors, network failures, CAPTCHA, rate limiting responses, with clear user feedback and recovery options

**Independent Test**: Simulate error conditions (log out, disconnect network, rate limit detection), verify clear error messages, pause/resume functionality, partial scrape handling

### Implementation for User Story 4

- [X] T029 [P] [US4] Implement authentication detection in scraper/metadata-extractor.js (detect login page redirect URLs, specific DOM elements indicating logged-out state)
- [X] T030 [P] [US4] Implement CAPTCHA detection in scraper/metadata-extractor.js (detect HTTP response codes 403, page content patterns with "captcha" or "robot" keywords)
- [X] T031 [P] [US4] Implement 429 rate limit detection and adaptive backoff in utils/retry-handler.js (pause 30 seconds on 429, reduce rate to 50% of current setting)
- [X] T032 [US4] Add error message display to overlay UI in overlay-ui.js (clear, actionable messages: "Not logged in to Audible", "Network error - retrying...", "CAPTCHA detected - please solve and restart")
- [ ] T033 [US4] Implement pause/resume functionality in content-script.js (save progress on page unload, detect incomplete session on load, show "Resume" or "Start Fresh" options) - SKIPPED (not needed per user request)
- [X] T034 [US4] Add error recovery options to overlay UI in overlay-ui.js (Retry button, Cancel button, display partial scrape warnings)

**Checkpoint**: All user stories 1-4 work - extension handles errors gracefully with recovery options

---

## Phase 7: User Story 5 - Website API Upload (P3 - DEFERRED/FUTURE)

**Goal**: POST JSON payload to website /api/sync/import endpoint with JWT token, handle success/error responses

**⚠️ DEFERRED**: These tasks are documented for future implementation but NOT part of MVP. Extension currently only supports JSON download.

**Independent Test**: Obtain sync token from website, complete scrape with token detection, verify extension POSTs JSON to /api/sync/import with Authorization: Bearer header, receives success response

### Implementation for User Story 5 (FUTURE)

- [ ] T035 [US5] Implement token detector in utils/token-detector.js (parse URL fragment #token=xxx or query param ?token=xxx, store in chrome.storage.local with timestamp)
- [ ] T036 [US5] Implement API upload POST request handler in content-script.js (fetch to website endpoint, Authorization: Bearer header, handle 401/200/500 responses)
- [ ] T037 [US5] Add "Upload to Website" button to overlay UI in overlay-ui.js (appears when scrape complete and token detected, shows upload progress)
- [ ] T038 [US5] Add token expiry detection in utils/token-detector.js (check timestamp, display "Token expired - generate new one" error if >15 minutes old)

**Note**: User Story 5 is explicitly deferred per specification - JSON download is sufficient for MVP

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final improvements affecting multiple user stories

- [ ] T039 [P] Add JSDoc comments to all modules (utils/, scraper/, content-script.js, overlay-ui.js)
- [ ] T040 [P] Validate JSON output against contracts/extension-output.schema.json (use JSON Schema validator, ensure 100% compliance)
- [ ] T041 Update README.md with complete installation instructions (Chrome developer mode, load unpacked, permissions explanation)
- [ ] T042 Run quickstart.md manual testing scenarios (Test Scenarios 1-10, verify all acceptance criteria, document results)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
  - US5 (P3) is DEFERRED - not part of MVP
- **Polish (Phase 8)**: Depends on all desired user stories being complete (US1-US4 for MVP)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ MVP READY
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Configures existing rate limiter from foundational
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Adds error handling to existing scrapers
- **User Story 5 (P3)**: DEFERRED - Not part of MVP, can be added after US1-US4 proven stable

### Within Each User Story

- Models/scrapers before integration
- Core implementation before UI updates
- Error handling after core functionality
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T003 (icons), T004 (PURPOSE.md), T005 (README.md), T006 (CSS) can all run in parallel
- **Phase 2**: T007 (storage), T008 (rate-limiter), T009 (retry), T010 (metadata-extractor), T012 (overlay UI) can all run in parallel; T011 (normalizer) and T013 (content-script) depend on others
- **Phase 3**: T014 (pagination) and T015 (extraction) can run in parallel before T016 (integration)
- **Phase 4**: T022 (wishlist scraper) can run in parallel with T024 (JSON normalizer update)
- **Phase 5**: T026 (UI config) and T027 (rate limiter update) should be sequential
- **Phase 6**: T029 (auth detection), T030 (CAPTCHA detection), T031 (429 handling) can all run in parallel
- **Phase 8**: T039 (JSDoc), T040 (validation), T042 (quickstart) can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch basic metadata extraction tasks together:
Task: "Implement library page pagination detection in scraper/library-scraper.js"
Task: "Implement library page basic metadata extraction in scraper/library-scraper.js"

# These can proceed simultaneously as they work on different aspects
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T013) - CRITICAL checkpoint
3. Complete Phase 3: User Story 1 (T014-T021)
4. **STOP and VALIDATE**: Test User Story 1 independently using quickstart.md Test Scenario 1 (Small Library Scraping)
5. Run quickstart.md Test Scenario 9 (JSON Schema Validation)
6. If validation passes → MVP is ready for user testing

### Incremental Delivery

1. **Foundation** (Phases 1-2) → Infrastructure ready
2. **MVP** (Phase 3: US1) → Test independently → Core value delivered ✅
3. **Add Wishlist** (Phase 4: US2) → Test independently → Extended value
4. **Add Rate Control** (Phase 5: US3) → Test independently → User control enhanced
5. **Add Error Handling** (Phase 6: US4) → Test independently → Production-ready robustness
6. **Defer API Upload** (Phase 7: US5) → Future enhancement after MVP proven stable
7. **Polish** (Phase 8) → Documentation and validation

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (critical shared foundation)
2. Once Foundational is done:
   - Developer A: User Story 1 (library scraping)
   - Developer B: User Story 2 (wishlist) - starts after A has basic library scraper working
   - Developer C: User Story 3 (rate limiting config)
   - Developer D: User Story 4 (error handling)
3. Stories complete and integrate independently
4. User Story 5 (API upload) deferred to post-MVP

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** maps task to specific user story for traceability
- **Each user story** should be independently completable and testable per quickstart.md scenarios
- **US5 is DEFERRED**: API upload marked as future work - MVP delivers JSON download only
- **No tests requested**: Specification does not request automated tests - validation via quickstart.md manual testing
- **Tech stack**: Plain JavaScript ES6+, React 19 (CDN), chrome.storage.local, Manifest V3
- **Reference codebase**: packages/audible-library-extractor provides battle-tested selectors and patterns
- **Commit frequently**: After each task or logical group of related tasks
- **Stop at checkpoints**: Validate each user story independently before proceeding
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence
