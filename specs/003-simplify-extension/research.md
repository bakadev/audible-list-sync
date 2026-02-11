# Research: Extension Simplification

**Feature**: Extension Simplification
**Branch**: `003-simplify-extension`
**Date**: 2026-02-11

## Overview

This document captures research findings and technical decisions for simplifying the Audible library extension by removing store page scraping and focusing on user-specific data extraction only.

## Research Questions

**Primary Question**: What user-specific data can we extract from library pages that is NOT available via external API?

**Answer**: Two data points are user-specific and not available via API:
1. **User Rating** (personal 0-5 star rating, distinct from aggregate Audible rating)
2. **Listening Status** (finished, not started, or time remaining in hours/minutes)

All other book metadata (authors, narrators, duration, summary, cover art, etc.) can be fetched from external API using ASIN.

## Technical Decisions

### Decision 1: Remove Store Page Scraping

**What**: Delete `scraper/store-scraper.js` and remove store page enrichment workflow from `content-script.js`.

**Rationale**:
- External API provides complete book metadata when given an ASIN
- Store page scraping is the primary performance bottleneck (10+ minutes for 100 titles)
- Store page fetches trigger rate limiting and CAPTCHA challenges
- 95% of HTTP requests can be eliminated by removing store page scraping

**Alternatives Considered**:
1. **Keep store scraping as fallback**: Rejected - adds complexity, maintains slow UX
2. **Fetch store pages in parallel**: Rejected - still 95% slower than library-only scraping, same rate limit risk
3. **Hybrid approach (API + store fallback)**: Rejected - API should be reliable, fallback adds unnecessary complexity

**Implementation Impact**:
- Remove `scraper/store-scraper.js` (~200 lines)
- Remove store scraping workflow from `content-script.js` (lines 213-247)
- Remove rate limiter throttling logic for store pages
- Simplify progress tracking (no enrichment phase)

**References**: Similar patterns in browser automation tools that scrape list views only, not detail pages.

---

### Decision 2: Extract User Rating from DOM

**What**: Parse personal user rating (0-5 stars) from `data-star-count` attribute.

**Rationale**:
- Personal ratings are user-specific and not available via external API
- Distinct from aggregate Audible rating (which API provides)
- Essential for users who rate books for personal organization

**DOM Pattern Discovered**:
```html
<div class="adbl-prod-rate-review-bar" data-star-count="4">
  <!-- Star rating UI elements -->
</div>
```

**Extraction Logic**:
1. Find `.adbl-prod-rate-review-bar` element within library row
2. Read `data-star-count` attribute
3. Parse as integer (0-5)
4. Default to `0` if element missing or attribute empty

**Edge Cases**:
- Element missing → default to `0` (user has not rated)
- `data-star-count="0"` → user explicitly gave 0 stars or didn't rate
- Invalid value → default to `0` and log warning

**Implementation**:
- Add `extractUserRating(element)` method to `metadata-extractor.js`
- Call from `library-scraper.js` and `wishlist-scraper.js`

**Testing**: Verify extraction for books rated 0, 1, 2, 3, 4, 5 stars and unrated books.

---

### Decision 3: Extract Listening Status from DOM

**What**: Parse listening progress from time remaining elements.

**Rationale**:
- Listening progress is user-specific and not available via API
- Users want to know which books are finished vs in-progress vs not started
- Status helps prioritize listening order

**DOM Patterns Discovered**:

**Pattern 1: Finished** (ASIN: B09GHRGYRF)
```html
<span class="bc-text bc-color-secondary" id="time-remaining-finished-B09GHRGYRF">
  Finished
</span>
```

**Pattern 2: In Progress** (ASIN: B0FXBHJXPD, 63% complete)
```html
<div id="time-remaining-display-B0FXBHJXPD">
  <div class="bc-progress-bar" aria-valuenow="63" aria-valuemin="0" aria-valuemax="100">
    <!-- Progress bar UI -->
  </div>
  <span class="bc-text bc-color-secondary">15h 39m left</span>
</div>
```

**Pattern 3: Not Started** (assumed when no status element found)

**Extraction Logic**:
1. Look for `#time-remaining-finished-{ASIN}` → if found, extract text "Finished"
2. Else look for `#time-remaining-display-{ASIN} .bc-text` → extract time remaining text (e.g., "15h 39m left")
3. Else default to "Not Started"

**Status Value Examples**:
- `"Finished"` (completed book)
- `"15h 39m left"` (in progress)
- `"2h 15m left"` (in progress)
- `"Not Started"` (default for wishlist or unplayed books)

**Edge Cases**:
- Both elements missing → default to "Not Started"
- Empty text content → default to "Not Started"
- Malformed time pattern → keep raw text (e.g., "30 minutes left")

**Implementation**:
- Add `extractListeningStatus(element, asin)` method to `metadata-extractor.js`
- Call from `library-scraper.js` and `wishlist-scraper.js`
- Include ASIN parameter for ID-based element lookups

**Testing**: Verify extraction for finished books, in-progress books with various time formats, and not-started books.

---

### Decision 4: Remove UI Configuration Options

**What**: Remove rate limit slider and "Current Page Only" checkbox from overlay UI.

**Rationale**:
- Rate limiting unnecessary without store page fetches (library pages load instantly)
- Current page only mode not useful when scraping is fast (<30 seconds for 100 titles)
- Simpler UI reduces cognitive load and setup time
- Fewer settings means fewer support questions

**UI Elements to Remove**:
1. Settings panel `<div class="audible-ext-settings">`
2. Rate limit slider `<input type="range" class="audible-ext-slider">`
3. Slider value display `<div class="audible-ext-slider-value">`
4. "Current Page Only" checkbox `<input type="checkbox">`

**Implementation**:
- Remove settings HTML from `overlay-ui.js` (lines ~150-200)
- Remove `handleSettingsChange` event handler from `content-script.js`
- Remove settings CSS from `overlay.css` (lines 204-250)
- Hardcode rate limit to 10 req/sec in `RateLimiter` constructor (reasonable default for library page fetches)

**Testing**: Verify overlay shows only "Start Sync" and "Download JSON" buttons, no settings panel.

---

### Decision 5: Keep Retry/Cancel Error Recovery

**What**: Maintain retry and cancel buttons for error handling (already implemented in Phase 6).

**Rationale**:
- Provides good UX balance between simplicity and recoverability
- Most errors are transient (network issues) and recoverable with simple retry
- Cancel allows users to abort and start fresh
- No additional complexity - already implemented

**UI Elements to Keep**:
1. Error message display
2. Retry button (restarts scraping from beginning)
3. Cancel button (resets to initial state)

**Implementation**: No changes needed - already in `overlay-ui.js` and `content-script.js`.

**Testing**: Verify retry/cancel buttons appear on errors and function correctly.

---

## Performance Analysis

### Current Implementation (with store scraping):
- **100 titles**: 10-15 minutes
- **HTTP requests**: ~300 (100 library pages + 200 store pages)
- **Rate limiting**: Required (5 req/sec max to avoid CAPTCHA)
- **User wait time**: High cognitive load, users often abandon

### Simplified Implementation (library-only):
- **100 titles**: <30 seconds
- **HTTP requests**: ~3-5 (library pagination only)
- **Rate limiting**: Optional (library pages load fast)
- **User wait time**: Minimal, instant gratification

**Performance Improvement**: 95% faster scraping, 95% fewer HTTP requests.

---

## Data Completeness Analysis

### Fields Removed (Available via API):
- Authors, Narrators, Duration, Cover Image URL
- Series Name/Position, Publisher, Release Date
- Categories, Summary, Aggregate Rating, Review Count
- Subtitle

**Impact**: No data loss - all removed fields are book metadata (same for all users), available from API using ASIN.

### Fields Retained (User-Specific):
- ASIN (required for API lookup)
- Title (for error reporting and user visibility)
- User Rating (personal 0-5 star rating, not in API)
- Listening Status (finished/in-progress/not-started, not in API)
- Source (LIBRARY vs WISHLIST, user-specific context)

**Impact**: All user-specific data is preserved. No functionality loss for users.

---

## Risk Assessment

### Low Risk:
- ✅ DOM selectors may change → mitigated by fallback defaults
- ✅ Performance degradation → impossible, removing slow code
- ✅ Data loss → impossible, only removing API-available data

### Medium Risk:
- ⚠️ External API availability → if API down, users still get ASIN list
- ⚠️ User confusion about missing metadata → mitigated by clear documentation

### Mitigation Strategies:
1. Default values for missing DOM elements (user rating → 0, status → "Not Started")
2. Clear error messages if extraction fails
3. Documentation explaining API integration model
4. JSON output still includes title for manual lookups if API fails

---

## Conclusion

All research questions resolved. No blocking issues identified. Implementation can proceed with high confidence.

**Key Findings**:
1. User rating extractable from `data-star-count` attribute
2. Listening status extractable from time remaining elements
3. Store page scraping is replaceable with API integration
4. UI simplification improves UX without losing functionality
5. 95% performance improvement achievable by focusing on user-specific data

**Next Step**: Proceed to Phase 1 (data model, contracts, quickstart).
