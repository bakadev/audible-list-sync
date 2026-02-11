# Implementation Plan: Extension Simplification

**Branch**: `003-simplify-extension` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-simplify-extension/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Simplify the Audible library extension by removing store page scraping and focusing only on user-specific data extraction. An external API will provide detailed book metadata (authors, narrators, duration, summary, etc.) when given an ASIN. The extension now scrapes only: ASIN, title (for error reporting), user rating (personal star rating), and listening status (Finished, Not Started, or time remaining).

This reduces scraping time by 95%, eliminates 95% of HTTP requests, and simplifies the UI by removing configuration options (rate limit slider, current page only checkbox).

**Key Changes**:
- Remove store page scraper (StoreScraper.scrapeStorePages)
- Extract user rating from `data-star-count` DOM attribute
- Extract listening status from time remaining DOM elements
- Remove rate limiter configuration UI
- Remove "Current Page Only" checkbox UI
- Keep retry/cancel error recovery buttons
- Maintain library and wishlist scraping for user-specific data

## Technical Context

**Language/Version**: JavaScript ES6+ (browser environment, Chrome Manifest V3)
**Primary Dependencies**: Chrome Extension APIs (storage, content scripts), React 19 (CDN for overlay UI)
**Storage**: chrome.storage.local (extension settings and scraped data persistence)
**Testing**: Manual testing via quickstart.md scenarios (no automated tests requested)
**Target Platform**: Chrome/Chromium browsers supporting Manifest V3
**Project Type**: Browser extension (monorepo package: `packages/extension/`)
**Performance Goals**: <30 seconds for 100 titles (vs 10+ minutes in current implementation)
**Constraints**: Browser extension sandboxing, no background execution, host_permissions limited to *.audible.com
**Scale/Scope**: Single package modification, ~10 JavaScript modules, removes ~40% of existing code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Security & Privacy First ✅ PASS

**Assessment**: No changes to security model. Extension still executes entirely in user's browser with their existing Audible session. No credentials, tokens, or authentication data are requested or transmitted.

**Impact**: Neutral - simplification does not affect security posture.

### Principle II: Package-Based Architecture ✅ PASS

**Assessment**: Changes are confined to the existing `packages/extension/` package. No new packages introduced. Package PURPOSE.md will be updated to reflect simplified scope.

**Impact**: Neutral - still single extension package with clear boundaries.

### Principle III: Data Normalization & Efficiency ✅ IMPROVED

**Assessment**: Simplified JSON output contains only user-specific fields (ASIN, title, userRating, status, source). Detailed book metadata (authors, narrators, duration, summary, etc.) will be fetched from external API using ASIN.

**Impact**: Positive improvement:
- Extension JSON payload reduced by 80% (5 fields vs 20+ fields)
- Faster uploads to platform API (smaller payloads)
- Catalog normalization happens server-side with API data, not duplicate scraping

### Principle IV: Responsible External System Integration ✅ IMPROVED

**Assessment**: Removing store page scraping eliminates 95% of HTTP requests to Audible servers. Extension now only fetches library/wishlist HTML pages (user-initiated, paginated).

**Impact**: Significant improvement:
- Reduced server load on Audible (no individual /pd/ASIN fetches)
- Faster scraping (no need for rate limiting delays)
- Lower risk of triggering rate limits or CAPTCHA
- Rate limiter still exists in code but config UI removed (hardcoded reasonable default)

### Principle V: User Control & Transparency ✅ IMPROVED

**Assessment**: Simplified UI removes cognitive load (no rate limit slider, no page-only checkbox). Users still have full control: Start/Stop scraping, Download JSON, Retry/Cancel on errors.

**Impact**: Positive improvement:
- Clearer UI with fewer decisions required
- Faster time-to-value (no configuration needed)
- Error handling still transparent (retry/cancel options)
- Progress tracking remains visible

### Gate Decision: ✅ PROCEED

All constitutional principles are satisfied or improved. No complexity justification needed. Simplification aligns with principles by reducing code complexity, server load, and user cognitive burden.

## Project Structure

### Documentation (this feature)

```text
specs/003-simplify-extension/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (user stories, requirements)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── extension-output.schema.json  # Simplified JSON schema
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Spec validation checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/extension/
├── manifest.json                     # Chrome extension configuration (MODIFY: remove unused permissions if any)
├── PURPOSE.md                        # Package scope documentation (UPDATE: reflect simplified scope)
├── README.md                         # Installation and usage (UPDATE: reflect simplified features)
│
├── content-script.js                 # Main orchestrator (MODIFY: remove store scraping workflow)
├── overlay-ui.js                     # React-based UI overlay (MODIFY: remove settings panel, keep retry/cancel)
│
├── scraper/
│   ├── library-scraper.js           # Library page scraper (MODIFY: add user rating and status extraction)
│   ├── wishlist-scraper.js          # Wishlist page scraper (MODIFY: add user rating and status extraction)
│   ├── metadata-extractor.js        # Base extraction utilities (MODIFY: add rating/status helpers)
│   └── store-scraper.js             # Store page scraper (REMOVE: no longer needed)
│
├── utils/
│   ├── storage-manager.js           # chrome.storage wrapper (KEEP: no changes)
│   ├── rate-limiter.js              # Request throttling (KEEP: used for library page fetches, hardcoded rate)
│   ├── retry-handler.js             # Error retry logic (KEEP: no changes)
│   └── json-normalizer.js           # Output formatting (MODIFY: simplify schema to 5 fields)
│
├── styles/
│   └── overlay.css                   # UI styles (MODIFY: remove settings panel styles)
│
└── icons/
    ├── icon16.png                    # Extension icons (KEEP: no changes)
    ├── icon48.png
    └── icon128.png
```

**Structure Decision**: Single browser extension package structure. No new modules needed. Primary changes are:
1. Remove `scraper/store-scraper.js` module entirely
2. Modify existing scrapers to extract user rating and listening status
3. Simplify overlay UI by removing settings panel (rate limit slider, page-only checkbox)
4. Update JSON normalizer to output simplified 5-field schema

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations. Simplification reduces complexity rather than adding it.

**Justification NOT required** - all gates passed.

## Phase 0: Research

**Research Questions**: None identified. This feature simplifies existing implementation by removing functionality rather than adding new patterns.

### Research Findings

**Decision 1: Remove Store Page Scraping**
- **What**: Delete `scraper/store-scraper.js` and remove store page fetch workflow from `content-script.js`
- **Rationale**: External API provides book metadata from ASIN. Store page scraping added 10+ minutes to sync time and risked rate limiting.
- **Alternatives Considered**:
  - Keep store scraping as fallback: Rejected - adds complexity, slower UX
  - Fetch store pages in parallel: Rejected - still 95% slower than library-only scraping
- **Implementation Impact**: Remove ~200 lines of code, eliminate HTTP request throttling logic

**Decision 2: Extract User Rating from DOM**
- **What**: Parse `data-star-count` attribute from `.adbl-prod-rate-review-bar` element
- **Rationale**: Personal user ratings (0-5 stars) are not available via external API - only aggregate Audible ratings
- **DOM Pattern**: `<div class="adbl-prod-rate-review-bar" data-star-count="4">` → extract integer value
- **Default**: If element missing or `data-star-count="0"`, default to `userRating: 0`
- **Implementation**: Add `extractUserRating(element)` method to `metadata-extractor.js`

**Decision 3: Extract Listening Status from DOM**
- **What**: Parse listening progress from time remaining elements
- **Rationale**: Listening progress (finished, not started, time remaining) is user-specific and not available via API
- **DOM Patterns**:
  - **Finished**: `<span id="time-remaining-finished-{ASIN}">Finished</span>` → extract text "Finished"
  - **In Progress**: `<span class="bc-text bc-color-secondary">15h 39m left</span>` (inside `#time-remaining-display-{ASIN}`) → extract text "15h 39m left"
  - **Not Started**: Element missing or no text → default to "Not Started"
- **Implementation**: Add `extractListeningStatus(element, asin)` method to `metadata-extractor.js`

**Decision 4: Remove UI Configuration Options**
- **What**: Remove rate limit slider and "Current Page Only" checkbox from overlay UI
- **Rationale**:
  - Rate limiting unnecessary without store page fetches (library pages load instantly)
  - Current page only mode not useful for simplified extraction (scraping is fast enough)
  - Simplifies UX - fewer decisions for users
- **Implementation**: Remove settings panel HTML, remove slider event handlers, hardcode rate limit in `RateLimiter` constructor

**Decision 5: Keep Retry/Cancel Error Recovery**
- **What**: Maintain retry and cancel buttons for error handling (implemented in Phase 6 of previous feature)
- **Rationale**: Provides good UX balance between simplicity and recoverability
- **Implementation**: No changes needed - already implemented in `overlay-ui.js` and `content-script.js`

## Phase 1: Design & Contracts

### Data Model (data-model.md)

See [data-model.md](./data-model.md) for complete entity definitions.

**Primary Entity**: UserLibraryTitle

Simplified from 20+ fields to 5 essential fields:

```typescript
interface UserLibraryTitle {
  asin: string;           // Audible product ID (e.g., "B09GHRGYRF")
  title: string;          // Book title (for error reporting and user visibility)
  userRating: number;     // Personal star rating (0-5, default 0 if unrated)
  status: string;         // Listening progress: "Finished", "Not Started", or "15h 39m left"
  source: string;         // "LIBRARY" or "WISHLIST"
}
```

**Removed Fields** (now handled by external API):
- authors (array)
- narrators (array)
- duration (number)
- coverImageUrl (string)
- series (object)
- publisher (string)
- releaseDate (string)
- categories (array)
- summary (string)
- aggregateRating (number)
- reviewCount (number)
- subtitle (string)

### API Contracts (contracts/)

See [contracts/extension-output.schema.json](./contracts/extension-output.schema.json) for complete schema.

**Extension Output Schema** (JSON downloaded by user):

```json
{
  "titleCatalog": [
    {
      "asin": "B09GHRGYRF",
      "title": "Project Hail Mary",
      "userRating": 5,
      "status": "Finished",
      "source": "LIBRARY"
    },
    {
      "asin": "B0FXBHJXPD",
      "title": "The Anthropocene Reviewed",
      "userRating": 4,
      "status": "15h 39m left",
      "source": "LIBRARY"
    },
    {
      "asin": "B0FZWMD83N",
      "title": "Wishlist Item Example",
      "userRating": 0,
      "status": "Not Started",
      "source": "WISHLIST"
    }
  ],
  "summary": {
    "libraryCount": 2,
    "wishlistCount": 1,
    "scrapeDurationMs": 12500,
    "scrapedAt": "2026-02-11T15:30:00Z"
  }
}
```

**Validation Rules**:
- `asin`: Required, non-empty string, alphanumeric
- `title`: Required, non-empty string
- `userRating`: Required, integer 0-5 inclusive
- `status`: Required, string (pattern: "Finished" | "Not Started" | /\d+h \d+m left/)
- `source`: Required, enum ["LIBRARY", "WISHLIST"]

### Integration Testing (quickstart.md)

See [quickstart.md](./quickstart.md) for complete test scenarios.

**Key Test Scenarios**:
1. Small library (10 titles) - verify all fields extracted correctly
2. Large library (100+ titles) - verify performance < 1 minute
3. Wishlist extraction - verify source flag "WISHLIST"
4. User rating extraction - verify 0-5 star ratings
5. Listening status extraction - verify "Finished", "Not Started", "Xh Ym left" patterns
6. Error handling - verify retry/cancel buttons work
7. UI simplification - verify no settings panel visible
8. JSON schema validation - verify output matches contracts/extension-output.schema.json

## Next Steps

**After this plan is approved**, run:

```bash
/speckit.tasks   # Generate implementation task breakdown
```

The task breakdown will organize work by user story:
- **Setup Phase**: Update PURPOSE.md, README.md, validate ignore files
- **US1**: Extract user-specific library data (rating, status)
- **US2**: Extract user-specific wishlist data
- **US3**: Remove configuration UI (settings panel)
- **US4**: Validate error handling (already implemented, just verify)
- **Polish Phase**: JSON schema validation, documentation updates

**Estimated Implementation Time**: 2-3 hours (mostly removing code, adding 2 new DOM extractors)
