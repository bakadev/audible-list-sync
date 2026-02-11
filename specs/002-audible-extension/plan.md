# Implementation Plan: Audible Library Extension

**Branch**: `002-audible-extension` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-audible-extension/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A Chrome Manifest V3 browser extension written in plain JavaScript that scrapes the user's Audible library and wishlist pages to extract comprehensive audiobook metadata, normalizes the data into a canonical JSON format, and provides download functionality. The extension uses a React-based overlay UI injected into Audible pages, implements responsible rate limiting (10 requests/second default), handles errors gracefully, and stores progress in chrome.storage.local for pause/resume capability. API upload to the website is deferred for future implementation.

## Technical Context

**Language/Version**: JavaScript ES6+ (no TypeScript, no build tools - native Chrome compatibility)
**Primary Dependencies**:
- React 19 (for overlay UI, loaded via CDN or inline)
- Chrome Extension APIs: chrome.storage, chrome.downloads, chrome.scripting
- Native fetch API for HTTP requests
**Storage**: chrome.storage.local (extension's local storage API)
**Testing**: Manual testing initially (automated tests deferred per constitution - not requested in spec)
**Target Platform**: Google Chrome / Chromium-based browsers with Manifest V3 support (Chrome 88+)
**Project Type**: Browser extension (single package)
**Performance Goals**:
- Scrape 200 titles in under 5 minutes (including rate limiting)
- Extract 95%+ of available metadata fields per title
- Responsive UI with progress updates every 10 titles
**Constraints**:
- No build step required - all code must run natively in Chrome
- Rate limiting: 10 requests/second default (configurable 1-20 req/sec)
- Must not overload Audible servers
- Extension size should remain under 5MB (uncompressed)
**Scale/Scope**:
- Single user operation (not multi-user)
- Library size: 1-1000+ titles typical
- Wishlist size: 0-100 titles typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Security & Privacy First ✅ PASS

**Assessment**: Extension fully complies - it operates entirely within the user's existing Audible browser session. No credentials are requested, stored, or transmitted.

- **FR-003**: Extension requires no build step that could inject malicious code
- **FR-005-006**: Sync token (if used in future) is detected from URL and stored locally only
- **Design Decision**: Extension scrapes using the user's authenticated session, never touches credentials

**Compliance**: FULL - No violations

### Principle II: Package-Based Architecture ✅ PASS

**Assessment**: Extension will be developed as a separate package (`packages/extension`) with clear boundaries.

- Extension has its own PURPOSE.md documenting scope and responsibilities
- Communication with website (when API upload implemented) occurs through well-defined JSON payload format
- No direct imports from packages/ui or packages/db
- References existing extension at `packages/audible-library-extractor` for scraping patterns (read-only reference)

**Compliance**: FULL - Clear package boundaries maintained

### Principle III: Data Normalization & Efficiency ⚠️ PARTIALLY RELEVANT

**Assessment**: Extension generates JSON payloads that follow the normalized schema (titleCatalog + userLibrary separation), but does not directly manage database. Normalization is handled by website's import API.

- **FR-024-025**: Extension normalizes scraped data into canonical format with separated title catalog and user library entries
- Extension output aligns with website's schema expectations

**Compliance**: RELEVANT GUIDANCE FOLLOWED - Extension respects normalization principle in its output format

### Principle IV: Responsible External System Integration ✅ PASS

**Assessment**: Extension implements comprehensive responsible scraping practices.

- **FR-021-023**: Rate limiting (default 10 req/sec, configurable 1-20 req/sec)
- **FR-032**: Exponential backoff on failed requests (1s, 2s, 4s)
- **FR-034**: Detects 429 rate limit responses, pauses 30 seconds, reduces rate
- **User Story 3**: Dedicated priority P2 story for respectful scraping
- **Design Decision (CAPTCHA)**: Aborts on bot detection rather than attempting circumvention

**Compliance**: FULL - Extensive rate limiting and graceful degradation implemented

### Principle V: User Control & Transparency ✅ PASS

**Assessment**: Extension provides comprehensive status reporting and user control.

- **FR-009**: Real-time progress display (current phase, item count, estimated time)
- **FR-010**: Clear error messages for all failure scenarios
- **FR-031-034**: Explicit error handling with actionable messages
- **User Story 4**: Dedicated priority P2 story for error handling and recovery
- **FR-027-028**: Pause/resume capability via chrome.storage.local, user-controlled download

**Compliance**: FULL - Transparency and control principles thoroughly addressed

### Summary

✅ **GATE PASSED** - All constitutional principles are satisfied. No violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-audible-extension/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (DOM selectors, React CDN patterns, Chrome API best practices)
├── data-model.md        # Phase 1 output (JSON payload schema definition)
├── quickstart.md        # Phase 1 output (Manual testing scenarios)
├── contracts/           # Phase 1 output (JSON schema for extension output)
├── checklists/
│   └── requirements.md  # Spec validation checklist (already complete)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/extension/
├── manifest.json                 # Manifest V3 configuration with permissions
├── README.md                     # Extension installation and usage instructions
├── PURPOSE.md                    # Package scope and responsibilities
├── content-script.js             # Main entry point - injected on Audible pages
├── overlay-ui.js                 # React overlay component (Start Sync, progress, download)
├── scraper/
│   ├── library-scraper.js        # Library page pagination and basic metadata extraction
│   ├── store-scraper.js          # Individual store page detailed metadata extraction
│   ├── wishlist-scraper.js       # Wishlist page scraping (similar to library)
│   └── metadata-extractor.js     # DOM selector logic, JSON-LD parsing, fallback handling
├── utils/
│   ├── rate-limiter.js           # Request throttling and queue management
│   ├── retry-handler.js          # Exponential backoff retry logic
│   ├── storage-manager.js        # chrome.storage.local wrapper for progress/resume
│   ├── json-normalizer.js        # Converts scraped data to canonical JSON format
│   └── token-detector.js         # URL parameter parsing for sync tokens (future)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── styles/
    └── overlay.css               # Minimal overlay UI styles

packages/audible-library-extractor/  # Reference implementation (READ ONLY)
└── [existing Vue-based extension - used as scraping pattern reference]
```

**Structure Decision**: Browser extension package with flat module structure. No build tooling means all files are directly loaded by Chrome. React overlay is the only UI framework, loaded via CDN link or inline. Scraper modules are organized by page type (library, store, wishlist). Utility modules handle cross-cutting concerns (rate limiting, retries, storage, normalization).

## Complexity Tracking

> **No constitutional violations to justify** - All gates passed. This section intentionally left empty.

---

## Phase 0: Research & Technical Discovery

**Status**: Ready to execute

### Research Questions

Based on Technical Context unknowns and implementation requirements, research needed in the following areas:

1. **Audible DOM Structure and Selectors**
   - Question: What are the current DOM selectors for library page elements (title cards, pagination)?
   - Question: What JSON-LD blocks are embedded on store pages and what metadata do they contain?
   - Question: How does Audible's pagination work (URL parameters, infinite scroll, "Load More" button)?
   - Question: Are there differences between grid view and list view selectors?
   - Action: Analyze packages/audible-library-extractor for working selector patterns

2. **React Integration Patterns for Chrome Extensions**
   - Question: What's the best way to load React in a content script without build tools?
   - Question: Should we use React CDN links in manifest.json web_accessible_resources, or inline React?
   - Question: How do we prevent React from conflicting with Audible's existing page JavaScript?
   - Action: Research Manifest V3 best practices for third-party library loading

3. **Chrome Extension APIs for Scraping**
   - Question: Can content scripts make cross-origin requests to audible.com/pd/* URLs, or do we need background script?
   - Question: What are chrome.storage.local size limits and how do we handle large libraries?
   - Question: How do we trigger browser downloads from content script (chrome.downloads requires background)?
   - Action: Review Chrome Extension API documentation for Manifest V3 restrictions

4. **Rate Limiting Implementation Patterns**
   - Question: What's the best approach for request throttling in JavaScript (promises queue, setTimeout, async iterators)?
   - Question: How do we maintain rate limit across page reloads if user navigates away mid-scrape?
   - Action: Research JavaScript rate limiting patterns and Chrome extension persistence

5. **Error Detection and Recovery**
   - Question: How do we detect CAPTCHA or bot detection challenges (specific HTTP codes, page content patterns)?
   - Question: What are Audible's typical rate limit response codes and retry-after headers?
   - Question: How do we detect authentication state (login page redirect, specific error elements)?
   - Action: Document known Audible error patterns from existing extension experience

### Research Execution Plan

**Task 1**: Analyze existing extension at packages/audible-library-extractor
- Extract working DOM selectors for library pages, store pages, wishlist
- Document JSON-LD block structure and available metadata fields
- Identify pagination patterns and authentication detection logic
- Estimate: 2 hours

**Task 2**: Research Chrome Extension Manifest V3 constraints
- Review Manifest V3 documentation for content_scripts, web_accessible_resources, cross-origin requests
- Determine if background service worker needed or if content script sufficient
- Research chrome.storage.local quota limits (typically 10MB per extension)
- Document chrome.downloads API usage from content script
- Estimate: 1 hour

**Task 3**: Prototype React overlay injection
- Test React CDN loading via content script
- Verify React doesn't conflict with Audible's page scripts (use isolated world)
- Prototype minimal overlay component (button, progress bar)
- Estimate: 1.5 hours

**Task 4**: Research rate limiting patterns
- Evaluate promise-based queue vs async iterator patterns
- Prototype simple rate limiter (10 req/sec with adjustable delay)
- Test persistence across page reloads using chrome.storage.local
- Estimate: 1 hour

**Task 5**: Document Audible error patterns
- List known HTTP error codes (429, 403, 401, 503)
- Identify CAPTCHA page patterns (specific DOM elements, URL redirects)
- Document login page detection (redirect URLs, DOM indicators)
- Estimate: 0.5 hours

**Total Estimate**: 6 hours research time

**Output**: research.md documenting all findings, with code snippets and selector examples

---

## Phase 1: Design Artifacts

**Status**: Blocked on Phase 0 research completion

### Artifacts to Generate

1. **data-model.md**: JSON payload schema definition
   - Document canonical JSON format structure (syncedAt, user info, titleCatalog array, userLibrary array)
   - Define Title object schema with all metadata fields (ASIN, title, subtitle, authors, narrators, series, duration, publisher, release date, categories, language, summary, cover art URL, ratings, Plus Catalog flag, Whispersync flag)
   - Define UserLibraryEntry schema (ASIN reference, source LIBRARY/WISHLIST, personal rating, listening progress, date added)
   - Validation rules for required vs optional fields

2. **contracts/extension-output.schema.json**: JSON Schema for extension output
   - Formal JSON Schema document defining the payload format
   - Used for validation during development and by website import API
   - Includes examples of valid payloads

3. **quickstart.md**: Manual testing guide
   - Installation instructions (load unpacked extension)
   - Test scenario 1: Small library (10 titles) - verify basic scraping and JSON download
   - Test scenario 2: Large library (100+ titles) - verify pagination and rate limiting
   - Test scenario 3: Wishlist scraping - verify source flagging
   - Test scenario 4: Error handling - simulate network failure, CAPTCHA, not logged in
   - Test scenario 5: Pause/resume - close tab mid-scrape, reopen and verify resume option

4. **Agent Context Update**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add technologies: "Chrome Extension Manifest V3", "React 19 (CDN)", "chrome.storage.local", "Audible DOM scraping"
   - Preserve existing manual additions

**Dependencies**: Phase 0 research must provide:
- Confirmed DOM selectors and JSON-LD structure
- React loading approach (CDN vs inline)
- Chrome API usage patterns (content script vs background)
- Rate limiting implementation pattern

---

## Next Steps After Planning

1. **Execute Phase 0 Research** (manual or via Task agent)
   - Complete all 5 research tasks documented above
   - Generate research.md with findings

2. **Execute Phase 1 Design** (after research complete)
   - Generate data-model.md, contracts/, quickstart.md
   - Update agent context

3. **Run `/speckit.tasks`** (after Phase 1 complete)
   - Generate executable task breakdown from plan and design artifacts
   - Tasks will be organized by user story (P1, P2, P3) for independent testing

4. **Implement via `/speckit.implement`** (after tasks generated)
   - Execute tasks in dependency order
   - Mark complete as work progresses

---

## Open Questions for Phase 0 Research

*These will be resolved during research phase and documented in research.md*

- [ ] What are the exact DOM selectors for current Audible library page structure?
- [ ] Does Audible use infinite scroll or paginated "Load More" buttons?
- [ ] What metadata is available in JSON-LD blocks vs requiring DOM scraping?
- [ ] Can content scripts make fetch requests to audible.com/pd/* or does CORS block it?
- [ ] What's the chrome.storage.local quota and how do we handle 1000+ title libraries?
- [ ] Best pattern for loading React without build tools - CDN or inline bundle?
- [ ] How does Audible detect and respond to bot behavior (specific error codes/pages)?
