# Feature Specification: Extension Simplification

**Feature Branch**: `003-simplify-extension`
**Created**: 2026-02-11
**Status**: Draft
**Input**: User description: "Simplify the Audible extension architecture by leveraging external API for book metadata, focusing extension on user-specific data extraction only"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Extract User-Specific Library Data (Priority: P1)

Users want to export their Audible library data with user-specific information (personal ratings and listening progress) that cannot be obtained from external APIs. The extension scrapes only ASIN, title (for error reporting), user rating, and listening status, while a separate API provides detailed book metadata.

**Why this priority**: Core value proposition - capture user-specific data that only exists in the user's library view. External API handles book details (authors, narrators, summary, etc.) using ASIN, eliminating the need for expensive store page scraping.

**Independent Test**: Install extension, visit audible.com/library, click "Start", verify JSON contains: ASIN, title, userRating (0-5 stars), and status ("Finished", "Not Started", or "Xh Ym left").

**Acceptance Scenarios**:

1. **Given** user has rated a book 4 stars, **When** extension scrapes library, **Then** JSON contains `"userRating": 4` for that ASIN
2. **Given** user has finished a book, **When** extension scrapes library, **Then** JSON contains `"status": "Finished"` for that ASIN
3. **Given** user has 15h 39m remaining on a book, **When** extension scrapes library, **Then** JSON contains `"status": "15h 39m left"` for that ASIN
4. **Given** user has not started a book, **When** extension scrapes library, **Then** JSON contains `"status": "Not Started"` for that ASIN
5. **Given** library has 100 titles, **When** scraping completes, **Then** total time is under 30 seconds (no store page fetches)

---

### User Story 2 - Extract User-Specific Wishlist Data (Priority: P2)

Users want to export their Audible wishlist with the same user-specific data points as their library. Wishlist titles are flagged with source: "WISHLIST" in the JSON output.

**Why this priority**: Completeness - users want visibility into both owned and desired titles. Wishlist scraping is equally fast (no store pages).

**Independent Test**: Visit audible.com/wl, activate extension, verify JSON includes wishlist entries with `"source": "WISHLIST"` and library entries with `"source": "LIBRARY"`.

**Acceptance Scenarios**:

1. **Given** user has 20 wishlist items, **When** extension scrapes wishlist, **Then** JSON contains 20 entries with `"source": "WISHLIST"`
2. **Given** wishlist item has no user rating, **When** extension scrapes wishlist, **Then** JSON contains `"userRating": 0` (default)
3. **Given** wishlist item has not been started, **When** extension scrapes wishlist, **Then** JSON contains `"status": "Not Started"`

---

### User Story 3 - Remove Configuration UI (Priority: P1)

Users no longer need rate limiting or page-specific scraping options. The extension removes these settings to simplify the user experience.

**Why this priority**: Reduced cognitive load - fewer decisions for users to make. Rate limiting is unnecessary without store page fetches (library pages load instantly).

**Independent Test**: Install extension, visit audible.com/library, verify overlay shows only "Start Sync" and "Download JSON" buttons (no settings panel, no sliders, no checkboxes).

**Acceptance Scenarios**:

1. **Given** extension loads, **When** user opens overlay, **Then** no rate limit slider is visible
2. **Given** extension loads, **When** user opens overlay, **Then** no "Current Page Only" checkbox is visible
3. **Given** extension loads, **When** user opens overlay, **Then** only "Start Sync" and "Download JSON" buttons are shown

---

### User Story 4 - Simplified Error Handling (Priority: P2)

When errors occur, users see clear messages with "Retry" and "Cancel" options. No complex pause/resume flows, no progress persistence across page refreshes.

**Why this priority**: Balance simplicity with usability. Most errors are recoverable with a simple retry (network issues, transient failures). Cancel allows users to reset cleanly.

**Independent Test**: Trigger error (disconnect network mid-scrape), verify error message displays with "Retry" and "Cancel" buttons. Click "Retry" to resume, click "Cancel" to reset.

**Acceptance Scenarios**:

1. **Given** network error occurs mid-scrape, **When** error detected, **Then** overlay displays error message with "Retry" and "Cancel" buttons
2. **Given** user clicks "Retry" after error, **When** retry initiated, **Then** scraping resumes from beginning (no progress saved)
3. **Given** user clicks "Cancel" after error, **When** cancel initiated, **Then** overlay resets to initial "Start Sync" state
4. **Given** user is not logged in, **When** user clicks "Start Sync", **Then** error message displays "Not logged in. Please log in to Audible and try again."

---

### Edge Cases

- What happens when user has 1000+ titles? (Scraping continues across all pages, may take 2-3 minutes for library-only extraction)
- How does system handle CAPTCHA? (Stops scraping, displays error with "Retry" button: "CAPTCHA detected. Solve CAPTCHA on Audible page and click Retry.")
- What if user closes tab during scraping? (Progress lost - user must start over on next visit)
- What happens when library page DOM structure changes? (Extraction fails, error displays: "Unable to extract data. Page structure may have changed.")
- What if book has no user rating? (Default to `"userRating": 0`)
- What if listening status element is missing? (Default to `"status": "Not Started"`)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST scrape library pages for: ASIN, title, user rating, listening status
- **FR-002**: Extension MUST extract user rating from `data-star-count` attribute on `.adbl-prod-rate-review-bar` element
- **FR-003**: Extension MUST extract listening status from DOM:
  - "Finished": Text content from `<span id="time-remaining-finished-{ASIN}">Finished</span>`
  - "Time remaining": Text content from `<span class="bc-text bc-color-secondary">Xh Ym left</span>` (inside `#time-remaining-display-{ASIN}`)
  - "Not Started": Default when no status element found
- **FR-004**: Extension MUST NOT fetch individual store pages (/pd/ASIN URLs)
- **FR-005**: Extension MUST scrape wishlist pages for same data points as library
- **FR-006**: Extension MUST flag wishlist entries with `"source": "WISHLIST"` and library entries with `"source": "LIBRARY"`
- **FR-007**: Extension MUST remove rate limit slider setting from UI
- **FR-008**: Extension MUST remove "Current Page Only" checkbox setting from UI
- **FR-009**: Extension MUST display "Retry" and "Cancel" buttons when errors occur
- **FR-010**: Extension MUST NOT persist progress across page refreshes (no resume functionality)
- **FR-011**: Extension MUST output JSON with simplified schema: ASIN, title, userRating, status, source
- **FR-012**: Extension MUST complete library scraping in under 1 minute for 100 titles
- **FR-013**: Extension MUST automatically detect pagination and scrape all library/wishlist pages

### Key Entities

- **Library Title**: Represents a book in user's Audible library with user-specific metadata
  - Required attributes: ASIN (string), title (string), userRating (integer 0-5), status (string), source (string: "LIBRARY" or "WISHLIST")
  - Status values: "Finished", "Not Started", or time remaining pattern (e.g., "15h 39m left")
  - Source: DOM extraction from library/wishlist page rows only

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can export their library in under 1 minute (for 100 titles)
- **SC-002**: Extension UI has 2 buttons maximum (Start Sync, Download JSON) - no settings panel
- **SC-003**: Scraping completes 95% faster than current implementation (by skipping store pages)
- **SC-004**: Extension makes 95% fewer HTTP requests (library/wishlist pages only, no store pages)
- **SC-005**: Code complexity reduced by 50% (measured by removal of store scraper, rate limiter config, progress persistence)
- **SC-006**: JSON output file size reduced by 80% (only 5 fields per title vs 20+ fields)
- **SC-007**: First-time users complete export successfully within 30 seconds of installation
- **SC-008**: Error recovery requires 1 click ("Retry" button) instead of manual page refresh
- **SC-009**: 100% of library titles include accurate user rating (0-5 stars)
- **SC-010**: 100% of library titles include accurate listening status (Finished, Not Started, or time remaining)
