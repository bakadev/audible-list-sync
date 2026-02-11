# Tasks: Extension Simplification

**Input**: Design documents from `/specs/003-simplify-extension/`
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
- Scrapers: `scraper/library-scraper.js`, `scraper/wishlist-scraper.js`, `scraper/metadata-extractor.js`, `scraper/store-scraper.js` (TO BE REMOVED)
- Utilities: `utils/rate-limiter.js`, `utils/retry-handler.js`, `utils/storage-manager.js`, `utils/json-normalizer.js`
- Styles: `styles/overlay.css`
- Documentation: `PURPOSE.md`, `README.md`

---

## Phase 1: Setup (Project Documentation)

**Purpose**: Update documentation to reflect simplified extension scope

- [X] T001 [P] Update PURPOSE.md in packages/extension/ to reflect simplified scope (user-specific data only, no store scraping)
- [X] T002 [P] Update README.md in packages/extension/ with simplified installation and usage instructions (remove rate limit, current page only references)
- [X] T003 [P] Update manifest.json version to 2.0.0 (major version bump for breaking schema change)

---

## Phase 2: Foundational (Core Extraction Methods)

**Purpose**: Add base extraction methods for user rating and listening status that all user stories will use

**⚠️ CRITICAL**: These methods must exist before US1 and US2 can extract user-specific data

- [X] T004 [P] [Foundation] Implement extractUserRating(element) method in scraper/metadata-extractor.js (parse data-star-count attribute, default to 0)
- [X] T005 [P] [Foundation] Implement extractListeningStatus(element, asin) method in scraper/metadata-extractor.js (detect Finished, Not Started, or time remaining)
- [X] T006 [Foundation] Add unit test helpers for extraction methods in scraper/metadata-extractor.js (validate patterns, test edge cases)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Extract User-Specific Library Data (Priority: P1) 🎯 MVP

**Goal**: Enable extraction of user rating and listening status from library pages, removing store page scraping workflow

**Independent Test**: Install extension, visit audible.com/library, click "Start Sync", download JSON, verify ASIN, title, userRating (0-5), status (Finished/Not Started/time left), source (LIBRARY) fields present

### Implementation for User Story 1

- [X] T007 [P] [US1] Update LibraryScraper.scrapeAllPages() in scraper/library-scraper.js to call extractUserRating() and extractListeningStatus() for each title
- [X] T008 [P] [US1] Remove StoreScraper import and store scraping phase from content-script.js (lines 213-247)
- [X] T009 [US1] Update content-script.js handleStartSync() to remove store enrichment workflow (Phase 2 in current implementation)
- [X] T010 [US1] Simplify progress tracking in content-script.js (remove enrichment phase, only library/wishlist phases)
- [X] T011 [US1] Update JSONNormalizer.normalize() in utils/json-normalizer.js to output simplified 5-field schema (asin, title, userRating, status, source)
- [X] T012 [US1] Remove old field mappings from JSONNormalizer (authors, narrators, duration, coverImageUrl, series, publisher, etc.)
- [X] T013 [US1] Delete scraper/store-scraper.js file entirely (no longer needed)

**Checkpoint**: At this point, User Story 1 should be fully functional - library extraction with user-specific data works

---

## Phase 4: User Story 2 - Extract User-Specific Wishlist Data (Priority: P2)

**Goal**: Extend user rating and listening status extraction to wishlist pages, using same methods as library

**Independent Test**: Visit audible.com/library (extension auto-fetches wishlist), download JSON, verify wishlist entries have source: "WISHLIST" and same user-specific fields

### Implementation for User Story 2

- [X] T014 [P] [US2] Update WishlistScraper.scrapeAllPages() in scraper/wishlist-scraper.js to call extractUserRating() and extractListeningStatus()
- [X] T015 [US2] Verify wishlist scraping workflow in content-script.js still functions (lines 153-211) with simplified extraction
- [X] T016 [US2] Test wishlist empty state handling (wishlist not accessible or empty should not break scraping)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - library + wishlist extraction complete

---

## Phase 5: User Story 3 - Remove Configuration UI (Priority: P1)

**Goal**: Simplify overlay UI by removing rate limit slider and "Current Page Only" checkbox

**Independent Test**: Visit audible.com/library, verify overlay shows only "Start Sync" and "Download JSON" buttons (no settings panel)

### Implementation for User Story 3

- [X] T017 [P] [US3] Remove settings panel HTML from overlay-ui.js (settings div, rate limit slider, current page only checkbox)
- [X] T018 [P] [US3] Remove handleSettingsChange() method and settings event listeners from content-script.js
- [X] T019 [P] [US3] Remove settings panel CSS from styles/overlay.css (lines 204-250: .audible-ext-settings, .audible-ext-slider, .audible-ext-checkbox)
- [X] T020 [US3] Hardcode rate limit to 10 req/sec in RateLimiter constructor in utils/rate-limiter.js (remove dynamic rate config)
- [X] T021 [US3] Remove currentPageOnly parameter from LibraryScraper.scrapeAllPages() and WishlistScraper.scrapeAllPages() (always scrape all pages)
- [X] T022 [US3] Remove settings storage logic from utils/storage-manager.js (loadSettings, saveSettings methods)

**Checkpoint**: UI is now simplified - no configuration options, just Start/Download buttons

---

## Phase 6: User Story 4 - Simplified Error Handling (Priority: P2)

**Goal**: Verify existing retry/cancel error handling works correctly (already implemented in Phase 6 of previous feature)

**Independent Test**: Trigger error (log out, disconnect network), verify retry/cancel buttons appear and function correctly

### Validation for User Story 4

- [X] T023 [US4] Verify retry button functionality in overlay-ui.js (handleRetry calls handleStartSync)
- [X] T024 [US4] Verify cancel button functionality in overlay-ui.js (handleCancel resets state)
- [X] T025 [US4] Test authentication error detection (MetadataExtractor.isLoggedIn) displays correct error message
- [X] T026 [US4] Test CAPTCHA detection (MetadataExtractor.detectCaptcha) displays correct error message
- [X] T027 [US4] Verify error messages are clear and actionable (no generic errors)

**Checkpoint**: All user stories 1-4 work - simplified extension is feature-complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation, documentation, and final cleanup affecting multiple user stories

- [ ] T028 [P] Validate JSON output against contracts/extension-output.schema.json using JSON Schema validator
- [ ] T029 [P] Test quickstart.md Scenario 1 (Small Library Extraction) - verify all fields extracted correctly
- [ ] T030 [P] Test quickstart.md Scenario 2 (User Rating Extraction) - verify 0-5 star ratings
- [ ] T031 [P] Test quickstart.md Scenario 3 (Listening Status Extraction) - verify Finished/Not Started/time patterns
- [ ] T032 [P] Test quickstart.md Scenario 4 (Wishlist Extraction) - verify source: "WISHLIST" flag
- [ ] T033 [P] Test quickstart.md Scenario 5 (Large Library Performance) - verify <1 minute for 100 titles
- [ ] T034 [P] Test quickstart.md Scenario 6 (UI Simplification) - verify no settings panel visible
- [ ] T035 Test quickstart.md Scenario 9 (JSON Schema Validation) - upload JSON to validator, confirm passes
- [ ] T036 Update CLAUDE.md agent context if any new patterns discovered during implementation
- [X] T037 Add inline comments to extractUserRating and extractListeningStatus methods documenting DOM patterns
- [X] T038 [P] Remove dead code and unused imports (StoreScraper references, settings-related code)
- [X] T039 Update manifest.json description to reflect simplified scope
- [X] T040 Final code review - verify constitutional compliance (Security, Data Efficiency, User Control principles)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS User Stories 1 and 2
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 depend on Foundation (extraction methods)
  - US3 (Remove UI) is independent, can run in parallel with US1/US2
  - US4 (Error Handling) is validation-only, can run after US1-US3
- **Polish (Phase 7)**: Depends on all user stories being complete (US1-US4)

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) - extraction methods must exist ✅ MVP READY
- **User Story 2 (P2)**: Depends on Foundational (Phase 2) - uses same extraction methods as US1
- **User Story 3 (P1)**: Independent - can start after Setup, does not depend on Foundation
- **User Story 4 (P2)**: Validation-only - can run after US1-US3 to verify error handling works

### Within Each User Story

- **US1**: Store scraper removal before JSON normalizer updates (avoid breaking references)
- **US2**: Library scraper must work before wishlist scraper (test extraction methods first)
- **US3**: Settings HTML removal before CSS removal (avoid orphaned styles)
- **US4**: All validation tasks can run in parallel

### Parallel Opportunities

- **Phase 1**: T001 (PURPOSE.md), T002 (README.md), T003 (manifest version) can all run in parallel
- **Phase 2**: T004 (extractUserRating), T005 (extractListeningStatus) can run in parallel; T006 (tests) depends on T004/T005
- **Phase 3**: T007 (library scraper), T008 (remove store import), T010 (simplify progress) can run in parallel
- **Phase 4**: T014 (wishlist scraper), T015 (verify workflow), T016 (test empty state) can run in parallel
- **Phase 5**: T017 (remove HTML), T018 (remove handlers), T019 (remove CSS), T020 (hardcode rate), T021 (remove params), T022 (remove storage) can all run in parallel
- **Phase 6**: T023-T027 (all validation tasks) can run in parallel
- **Phase 7**: T028 (schema validation), T029-T034 (quickstart scenarios), T036 (agent context), T037 (comments), T038 (cleanup), T039 (manifest desc) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch library scraper updates and removal tasks together:
Task: "Update LibraryScraper.scrapeAllPages() to call extractUserRating() and extractListeningStatus()"
Task: "Remove StoreScraper import and store scraping phase from content-script.js"
Task: "Simplify progress tracking in content-script.js"

# These can proceed simultaneously as they work on different aspects
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T006) - CRITICAL checkpoint
3. Complete Phase 3: User Story 1 (T007-T013)
4. **STOP and VALIDATE**: Test User Story 1 independently using quickstart.md Scenario 1-3
5. Verify JSON schema validation (quickstart.md Scenario 9)
6. If validation passes → MVP is ready for testing

### Incremental Delivery

1. **Foundation** (Phases 1-2) → Extraction methods ready
2. **MVP** (Phase 3: US1) → Test independently → Library extraction with user data works ✅
3. **Add Wishlist** (Phase 4: US2) → Test independently → Library + wishlist complete
4. **Simplify UI** (Phase 5: US3) → Test independently → Settings removed, cleaner UX
5. **Validate Errors** (Phase 6: US4) → Test independently → Error handling confirmed
6. **Polish** (Phase 7) → Documentation and validation complete
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (critical shared foundation)
2. Once Foundational is done:
   - Developer A: User Story 1 (library extraction)
   - Developer B: User Story 3 (remove settings UI) - can start immediately, no dependency on US1
   - Developer C: User Story 2 (wishlist extraction) - starts after A has basic library working
3. Developer D: User Story 4 validation (after US1-US3 complete)
4. Team: Polish phase together

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** maps task to specific user story for traceability
- **Each user story** should be independently completable and testable per quickstart.md scenarios
- **No tests requested**: Specification does not request automated tests - validation via quickstart.md manual testing
- **Tech stack**: Plain JavaScript ES6+, React 19 (CDN), chrome.storage.local, Manifest V3
- **Simplification focus**: Removing code (store scraper, settings UI) and adding 2 new extraction methods
- **Performance target**: <30 seconds for 100 titles (vs 10+ minutes in previous implementation)
- **Commit frequently**: After each task or logical group of related tasks
- **Stop at checkpoints**: Validate each user story independently before proceeding
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence

## Implementation Notes

### Critical Files

**Must Modify**:
- `scraper/metadata-extractor.js` - add extractUserRating, extractListeningStatus
- `scraper/library-scraper.js` - call new extraction methods
- `scraper/wishlist-scraper.js` - call new extraction methods
- `content-script.js` - remove store scraping workflow, simplify progress
- `overlay-ui.js` - remove settings panel HTML
- `utils/json-normalizer.js` - simplify to 5-field schema
- `styles/overlay.css` - remove settings styles

**Must Remove**:
- `scraper/store-scraper.js` - entire file deleted

**Update Only**:
- `PURPOSE.md`, `README.md` - documentation
- `manifest.json` - version bump, description

### DOM Extraction Patterns

**User Rating** (from research.md):
```javascript
// Pattern: <div class="adbl-prod-rate-review-bar" data-star-count="4">
const ratingElement = element.querySelector('.adbl-prod-rate-review-bar');
const userRating = ratingElement ? parseInt(ratingElement.dataset.starCount) || 0 : 0;
```

**Listening Status** (from research.md):
```javascript
// Pattern 1: Finished
// <span id="time-remaining-finished-{ASIN}">Finished</span>
const finishedEl = element.querySelector(`#time-remaining-finished-${asin}`);
if (finishedEl && finishedEl.textContent.includes('Finished')) {
  return 'Finished';
}

// Pattern 2: In Progress
// <span class="bc-text bc-color-secondary">15h 39m left</span>
const timeEl = element.querySelector(`#time-remaining-display-${asin} .bc-text`);
if (timeEl && timeEl.textContent.includes('left')) {
  return timeEl.textContent.trim();
}

// Pattern 3: Not Started (default)
return 'Not Started';
```

### Performance Expectations

- **Previous implementation**: 10-15 minutes for 100 titles
- **Simplified implementation**: <30 seconds for 100 titles
- **Improvement**: 95% faster scraping time
- **HTTP requests**: 3-5 library pages vs 300+ (library + store pages)

### Breaking Changes

**JSON Schema**: Incompatible with previous extension output (20+ fields reduced to 5 fields)

**Migration**: Platform API must detect schema version and handle both old and new formats
