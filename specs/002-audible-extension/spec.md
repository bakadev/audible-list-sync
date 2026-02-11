# Feature Specification: Audible Library Extension

**Feature Branch**: `002-audible-extension`
**Created**: 2026-02-11
**Status**: Draft
**Input**: User description: "Chrome extension for scraping and syncing Audible library data. Manifest V3, plain JavaScript, React overlay UI, comprehensive metadata extraction from library and store pages, JSON download output."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Library Scraping and JSON Export (Priority: P1)

A user visits their Audible library page and activates the extension to scrape all books in their library, extracting comprehensive metadata for each title, and downloads the complete dataset as a JSON file.

**Why this priority**: Core functionality that provides immediate value - allows users to export their complete library data for backup, analysis, or migration purposes. This is the minimum viable product.

**Independent Test**: Can be fully tested by installing the extension, visiting audible.com/library, clicking "Start Sync", and verifying a complete JSON file downloads with all library titles and their metadata.

**Acceptance Scenarios**:

1. **Given** a user is logged into Audible and on their library page, **When** they click the "Start Sync" button in the extension overlay, **Then** the extension scrapes all library titles across multiple pages, extracts comprehensive metadata (ASIN, title, subtitle, authors, narrators, series info, duration, publisher, release date, categories, language, summary, cover art URL, ratings, listening progress, Plus Catalog status, Whispersync status), and displays progress.

2. **Given** the library scraping has completed successfully, **When** the user clicks the "Download JSON" button, **Then** a properly formatted JSON file downloads to their computer containing all scraped library data in the canonical format.

3. **Given** the user has a large library (100+ titles), **When** scraping is in progress, **Then** the overlay displays real-time progress (e.g., "Scraped 47 of 153 titles") and estimated time remaining.

---

### User Story 2 - Wishlist Scraping (Priority: P2)

A user scrapes not only their owned library but also their wishlist, with wishlist items clearly flagged in the exported data.

**Why this priority**: Extends core functionality to capture complete user data including aspirational titles. Allows users to export their entire Audible relationship (owned + desired).

**Independent Test**: Can be tested independently by visiting audible.com/wl (wishlist), activating the extension, and verifying the JSON output includes wishlist entries with source: "WISHLIST" flag.

**Acceptance Scenarios**:

1. **Given** a user has items in their Audible wishlist, **When** they run the extension scraping process, **Then** the extension automatically detects and scrapes both library and wishlist pages, flagging each entry with its source.

2. **Given** the user's wishlist is on a separate Audible URL, **When** the extension activates, **Then** it navigates to both library and wishlist pages programmatically to collect all data in a single operation.

---

### User Story 3 - Rate Limiting and Respectful Scraping (Priority: P2)

The extension throttles requests to Audible's servers to avoid overloading them, with configurable rate limits.

**Why this priority**: Critical for responsible scraping behavior and avoiding detection/blocking by Audible. Required for MVP to be ethically sound.

**Independent Test**: Can be tested by monitoring network requests during a scrape and verifying they occur at the configured rate (default 10 requests/second), with no burst patterns.

**Acceptance Scenarios**:

1. **Given** the extension is scraping a library with 200 titles, **When** fetching individual store pages for detailed metadata, **Then** requests are throttled to approximately 10 requests per second (default setting).

2. **Given** a user wants to scrape faster or slower, **When** they adjust the rate limit setting, **Then** the extension respects the new limit (e.g., 5/sec for slower, 15/sec for faster).

---

### User Story 4 - Error Handling and Recovery (Priority: P2)

The extension gracefully handles errors like network failures, missing data, or authentication issues, providing clear feedback to the user.

**Why this priority**: Essential for production use - errors will occur and users need clear guidance on how to recover.

**Independent Test**: Can be tested by simulating error conditions (disconnect network mid-scrape, log out of Audible, rate limit detection) and verifying appropriate error messages and recovery options.

**Acceptance Scenarios**:

1. **Given** the user is not logged into Audible, **When** they attempt to start a scrape, **Then** the extension detects the authentication state and displays: "Not logged in to Audible. Please log in and try again."

2. **Given** a network error occurs during scraping (e.g., timeout fetching a store page), **When** the error is detected, **Then** the extension retries the request up to 3 times with exponential backoff, and if all retries fail, marks that title as partial and continues with remaining titles.

3. **Given** the extension encounters a title with missing metadata (e.g., no duration field), **When** normalizing the data, **Then** the extension includes the title in the output with available fields populated and missing fields marked as null, logging warnings for review.

4. **Given** a user's scraping session is interrupted (browser closed, tab closed), **When** they restart the extension, **Then** previously scraped data is preserved in chrome.storage.local and the user has an option to resume or start fresh.

---

### User Story 5 - Website API Upload (Priority: P3 - FUTURE/DEFERRED)

A user completes a library scrape and uploads the JSON payload directly to the website's sync API endpoint using a time-limited JWT token.

**Why this priority**: This is the ultimate goal but deferred for MVP. The extension first needs to prove it can reliably generate correct JSON output before automating the upload.

**Independent Test**: Can be tested by obtaining a sync token from the website, running the extension with token detection enabled, completing a scrape, and verifying the extension POSTs the JSON to /api/sync/import with the JWT in the Authorization header and receives a success response.

**Acceptance Scenarios**:

1. **Given** a user has generated a sync token on the website and the website has redirected them to audible.com with the token in the URL, **When** the extension content script loads on the Audible page, **Then** it detects the token from the URL fragment or query parameter and stores it securely.

2. **Given** a sync token has been detected and a scrape completes successfully, **When** the user clicks "Upload to Website" (or auto-upload is enabled), **Then** the extension POSTs the JSON payload to the configured website endpoint with the token in the Authorization header.

3. **Given** the token has expired (15 minute TTL), **When** the extension attempts to upload, **Then** the API returns a 401 error and the extension displays: "Sync token expired. Please generate a new token from the website."

4. **Given** the API upload succeeds, **When** the server responds with a success message and import summary, **Then** the extension displays the summary (e.g., "Successfully synced 247 titles, 12 new additions to catalog") and clears the stored token.

---

### Edge Cases

- **What happens when the user has 1000+ titles?** The extension continues scraping across all paginated library pages until complete, with progress updates every 10 titles and estimated time remaining based on current rate.

- **How does the system handle Audible page structure changes?** If DOM selectors fail to find expected elements, the extension falls back to alternative selectors and logs warnings. If critical data cannot be extracted, the title is marked as partial.

- **What if a title has no store page?** The extension includes the title with basic metadata from the library page only, marking detailed fields as unavailable.

- **What if the wishlist is private or disabled?** The extension detects a 403 or 404 when attempting to access the wishlist URL and gracefully skips wishlist scraping, noting in the final report: "Wishlist unavailable."

- **What if Audible rate limits or blocks the extension?** If the extension receives 429 (Too Many Requests) or 503 responses, it pauses scraping for 30 seconds, then retries with a reduced rate (half the current setting).

- **What if the user navigates away from the Audible page mid-scrape?** The content script detects page unload and saves progress to chrome.storage.local. The overlay shows a warning: "Scraping paused. Return to Audible to resume."

- **What if a title has corrupt or malformed data on the store page?** The extension validates each field during extraction and logs parse errors. Malformed fields are marked as null with a warning note.

## Requirements *(mandatory)*

### Functional Requirements

#### Manifest and Permissions

- **FR-001**: Extension MUST use Chrome Manifest V3 format with required permissions: activeTab, storage, and host permissions for *.audible.com and the website's import endpoint URL.
- **FR-002**: Extension MUST declare content_scripts to inject on audible.com/library* and audible.com/wl* pages.
- **FR-003**: Extension MUST NOT require a build step - all code should be plain JavaScript (ES6+) compatible with Chrome's native support.

#### Content Script and Initialization

- **FR-004**: Content script MUST inject on Audible library and wishlist pages automatically when the user navigates to those URLs.
- **FR-005**: Content script MUST check the current URL for sync token passed as a URL fragment (e.g., #token=xxx) or query parameter (e.g., ?token=xxx).
- **FR-006**: Extension MUST store detected sync tokens securely in chrome.storage.local with a timestamp for expiry tracking.

#### User Interface (React Overlay)

- **FR-007**: Extension MUST render a minimal React-based overlay UI on top of the Audible page (positioned in bottom-right corner by default).
- **FR-008**: Overlay MUST include a "Start Sync" button (primary state), progress indicator during scraping, and "Download JSON" button when complete.
- **FR-009**: Overlay MUST display real-time scraping status: current phase (e.g., "Scraping library page 3"), progress (e.g., "47 of 153 titles"), and estimated time remaining.
- **FR-010**: Overlay MUST show clear error messages when failures occur (e.g., "Network error - retrying...", "Not logged in to Audible").
- **FR-011**: Overlay MUST be collapsible/expandable to minimize screen real estate usage.

#### Library Page Scraping

- **FR-012**: Extension MUST fetch all paginated library list pages at audible.com/library, detecting pagination structure automatically.
- **FR-013**: For each title on library pages, extension MUST extract basic metadata: ASIN, title, authors, narrators, cover image URL, series information.
- **FR-014**: Extension MUST handle both grid and list view layouts on library pages.

#### Store Page Scraping

- **FR-015**: For each ASIN from the library, extension MUST fetch the individual product page (audible.com/pd/ASIN) to extract detailed metadata.
- **FR-016**: Extension MUST parse embedded JSON-LD blocks on store pages for structured data (duration, rating, summary, categories, publisher, release date, language).
- **FR-017**: Extension MUST fall back to DOM scraping if JSON-LD blocks are unavailable or incomplete.
- **FR-018**: Extension MUST extract all available metadata: title, subtitle, ASIN, authors, narrators, series info, duration, publisher, release date, categories, language, summary, cover art URL, aggregate rating, rating count, user's personal rating, listening progress percentage, Plus Catalog eligibility, Whispersync status.

#### Wishlist Scraping

- **FR-019**: Extension MUST automatically navigate to audible.com/wl and scrape wishlist titles using the same pagination logic as library pages.
- **FR-020**: Wishlist entries MUST be flagged with source: "WISHLIST" in the JSON payload to distinguish from owned titles.

#### Rate Limiting

- **FR-021**: Extension MUST throttle HTTP requests to Audible at a configurable rate (default: 10 requests/second).
- **FR-022**: Rate limit MUST apply to store page fetches, not library page pagination (which should be faster).
- **FR-023**: Extension MUST allow users to adjust rate limit via settings (range: 1-20 requests/second).

#### JSON Payload Assembly

- **FR-024**: Extension MUST normalize all scraped data into a canonical JSON format matching the shared schema structure (titleCatalog entries + userLibrary entries).
- **FR-025**: JSON output MUST include: syncedAt timestamp, user identifier (if available), summary statistics (totalTitles, libraryCount, wishlistCount), titles array with full metadata.
- **FR-026**: Extension MUST validate required fields (ASIN, title) before including a title in the output, logging warnings for incomplete entries.

#### Data Storage and Download

- **FR-027**: Extension MUST store scraped JSON data in chrome.storage.local incrementally during scraping to support pause/resume.
- **FR-028**: Extension MUST provide a "Download JSON" button that triggers a browser download of the complete payload as a .json file with filename format: audible-library-YYYY-MM-DD.json.

#### API Upload (DEFERRED - Future Requirement)

- **FR-029 (FUTURE)**: Extension SHOULD POST the JSON payload to the website's /api/sync/import endpoint with the JWT token in the Authorization: Bearer header.
- **FR-030 (FUTURE)**: Extension SHOULD handle API responses: success (display summary), error (display message and allow retry), token expired (prompt user to regenerate).

#### Error Handling

- **FR-031**: Extension MUST detect when user is not logged into Audible (e.g., login page detected) and display error: "Please log in to Audible."
- **FR-032**: Extension MUST retry failed HTTP requests up to 3 times with exponential backoff (1s, 2s, 4s delays).
- **FR-033**: Extension MUST handle partial failures gracefully: if 5% or fewer titles fail to scrape, mark them as partial and continue; if more than 5% fail, pause and prompt user.
- **FR-034**: Extension MUST detect and handle Audible rate limiting (429 responses) by pausing for 30 seconds and reducing rate limit.

### Key Entities

- **Title**: Represents an audiobook in the Audible catalog. Attributes include: ASIN (unique identifier), title, subtitle, authors (array), narrators (array), series name and position, duration (minutes), publisher, release date, categories (array), language, summary text, cover image URL, aggregate rating (0-5), rating count, Plus Catalog flag, Whispersync flag.

- **User Library Entry**: Represents a user's relationship with a title. Attributes include: ASIN (references Title), source (LIBRARY or WISHLIST), personal rating (0-5 or null), listening progress percentage, date added, date last listened.

- **Sync Session**: Represents a single scraping operation. Attributes include: session ID, start timestamp, end timestamp, sync token (if applicable), titles scraped count, errors encountered, final status (completed, partial, failed).

- **Sync Token**: JWT token passed from website to extension via URL. Attributes include: token string, user ID (embedded in JWT), expiry timestamp (15 minutes from generation), scope (upload-only).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a library scrape of 200 titles in under 5 minutes (including rate limiting delays).

- **SC-002**: Extension extracts 95% or more of available metadata fields for each title (based on comparison with existing extension output).

- **SC-003**: Rate limiting effectively prevents Audible rate limit responses (429 errors) during normal operation with default settings.

- **SC-004**: JSON output is valid and conforms to the canonical schema 100% of the time (validated by website import API).

- **SC-005**: Users receive clear, actionable error messages for all failure scenarios (measured by manual testing of all error cases in Edge Cases section).

- **SC-006**: Extension overlay is responsive and non-blocking during scraping (UI remains interactive, user can pause/cancel).

- **SC-007**: 90% of users successfully complete their first scrape without requiring support or documentation (measured by early user testing).

## Assumptions *(optional)*

- User has an active Audible.com account with at least one title in their library.
- User is using Google Chrome or a Chromium-based browser (Edge, Brave, etc.) with Manifest V3 support.
- Audible's page structure and DOM selectors remain relatively stable (extension includes fallback selectors for resilience).
- The existing extension at packages/audible-library-extractor provides accurate reference for scraping logic and data extraction patterns.
- Users understand this is an unofficial tool and Audible may change their site structure, requiring extension updates.
- For MVP, users will manually download and inspect JSON files before importing to the website (API upload deferred).

## Out of Scope *(optional)*

- **Multi-region support**: Extension only supports audible.com (US). Other regional domains (audible.co.uk, audible.de, etc.) are excluded.
- **Automatic background syncing**: Extension only syncs on-demand when user clicks "Start Sync", not automatically or on schedule.
- **TypeScript or build tooling**: Extension uses plain JavaScript only - no compilation, transpilation, or bundling required.
- **Popup page UI**: All UI is via content script overlay, no browser action popup needed.
- **HTML gallery / CSV exports / Wallpaper creator**: Extension outputs JSON only, unlike the existing audible-library-extractor.
- **Multiple output formats**: Only canonical JSON format is supported, no CSV, XML, or other formats.
- **User authentication management**: Extension assumes user is already logged into Audible, does not handle login flow.
- **API key management**: Sync token is provided by website via URL, extension does not generate or manage tokens.

## Dependencies *(optional)*

- **External**: Requires access to audible.com (user must have network connectivity and valid Audible account).
- **Internal**: Depends on the canonical JSON schema defined for the shared types (packages/shared - though extension references types informally, not via import).
- **Browser APIs**: Requires Chrome Extension APIs: chrome.storage, chrome.scripting, chrome.downloads.
- **Reference codebase**: Uses packages/audible-library-extractor as reference for scraping patterns and selectors.

## Design Decisions *(resolved clarifications)*

**Audible Originals Handling**: Extension treats Audible Originals identically to purchased titles using the same extraction logic. If metadata structure differs and fields cannot be extracted, they are marked as null with warnings logged. This approach prioritizes simplicity and graceful degradation over special-case handling.

**Scraping Ethics and Compliance**: Extension proceeds with scraping on the principle that users have the right to export their own purchased and membership content. The extension is positioned as a personal backup tool, not for commercial scraping. Clear disclaimers will note this is for personal archival purposes only. Rate limiting (default 10 req/sec) demonstrates respect for Audible's servers. Users assume responsibility for compliance with Audible's Terms of Service.

**CAPTCHA and Bot Detection**: If the extension detects a CAPTCHA or bot detection challenge (via HTTP response codes or page content), it immediately aborts the scraping operation and displays an error message: "Audible bot detection triggered. Please solve any CAPTCHA challenges on the Audible page, then click Start Sync to restart." Partial progress is saved to chrome.storage.local but not automatically resumed - user must manually restart after resolving the challenge. This approach is simpler to implement and avoids attempting to circumvent security measures.
