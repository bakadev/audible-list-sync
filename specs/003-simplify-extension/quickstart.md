# Quickstart: Extension Simplification Testing

**Feature**: Extension Simplification
**Branch**: `003-simplify-extension`
**Date**: 2026-02-11

## Overview

This guide provides manual testing scenarios for the simplified Audible library extension. The extension has been simplified to extract only user-specific data (ASIN, title, user rating, listening status) with book metadata handled by external API.

## Prerequisites

### Installation

1. **Build Extension** (if needed):
   ```bash
   cd /Users/traviswilson/Development/my-audible-lists
   # No build step required - pure JavaScript extension
   ```

2. **Load Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select directory: `/Users/traviswilson/Development/my-audible-lists/packages/extension/`
   - Verify extension appears with Audible icon

3. **Verify Extension Loaded**:
   - Extension should show as "Audible Library Extension" with version number
   - Icon should be visible in extensions toolbar
   - No errors in console

### Test Data Requirements

To run all test scenarios, you need:
- Audible account with active session (logged in)
- Library with at least 10 books (mix of finished, in-progress, not-started)
- Books with various user ratings (0-5 stars)
- Wishlist with at least 3 items
- Library with 100+ titles (for performance testing)

---

## Test Scenarios

### Scenario 1: Small Library Extraction

**Objective**: Verify basic extraction of user-specific data from a small library.

**User Story**: User Story 1 (Extract User-Specific Library Data)

**Steps**:
1. Navigate to `https://www.audible.com/library`
2. Verify overlay appears in bottom-right corner with "Start Sync" button
3. Click "Start Sync"
4. Wait for scraping to complete (should be <10 seconds for 10 titles)
5. Click "Download JSON"
6. Open downloaded JSON file

**Expected Results**:
- ✅ JSON contains `titleCatalog` array with all library books
- ✅ Each entry has fields: `asin`, `title`, `userRating`, `status`, `source`
- ✅ `userRating` values are integers 0-5
- ✅ `status` values are "Finished", "Not Started", or match pattern "Xh Ym left"
- ✅ All `source` values are "LIBRARY"
- ✅ `summary.libraryCount` matches number of books in library
- ✅ `summary.wishlistCount` is 0 (no wishlist scraped yet)
- ✅ No errors in browser console

**Test Data**: Library with 10 books, mix of rated/unrated, mix of finished/in-progress/not-started

---

### Scenario 2: User Rating Extraction

**Objective**: Verify personal user ratings (0-5 stars) are extracted correctly.

**User Story**: User Story 1 (Extract User-Specific Library Data)

**Steps**:
1. In Audible library, manually verify star ratings for 5 books (note the ratings)
2. Navigate to `https://www.audible.com/library`
3. Click "Start Sync" in extension overlay
4. Download JSON after completion
5. Find the 5 books in JSON and compare `userRating` values

**Expected Results**:
- ✅ Books with 5 stars have `"userRating": 5`
- ✅ Books with 4 stars have `"userRating": 4`
- ✅ Books with 3 stars have `"userRating": 3`
- ✅ Books with 0 stars (or unrated) have `"userRating": 0`
- ✅ All ratings are integers (no decimals)

**Test Data**: Books with ratings 0, 1, 2, 3, 4, 5 stars

---

### Scenario 3: Listening Status Extraction

**Objective**: Verify listening progress status is extracted correctly.

**User Story**: User Story 1 (Extract User-Specific Library Data)

**Steps**:
1. In Audible library, identify:
   - 1 finished book (shows "Finished" badge)
   - 1 in-progress book (shows time remaining, e.g., "15h 39m left")
   - 1 not-started book (no progress indicator)
2. Navigate to `https://www.audible.com/library`
3. Click "Start Sync" in extension overlay
4. Download JSON after completion
5. Find the 3 books in JSON and verify `status` values

**Expected Results**:
- ✅ Finished book has `"status": "Finished"`
- ✅ In-progress book has `"status": "15h 39m left"` (or similar time pattern)
- ✅ Not-started book has `"status": "Not Started"`
- ✅ Time remaining format matches `\d+h \d+m left` pattern

**Test Data**: Books in different listening states

---

### Scenario 4: Wishlist Extraction

**Objective**: Verify wishlist titles are extracted with `source: "WISHLIST"`.

**User Story**: User Story 2 (Extract User-Specific Wishlist Data)

**Steps**:
1. Ensure you have at least 3 items in wishlist
2. Navigate to `https://www.audible.com/library` (not wishlist page - extension fetches wishlist automatically)
3. Click "Start Sync" in extension overlay
4. Wait for both library and wishlist scraping to complete
5. Download JSON after completion
6. Filter `titleCatalog` by `source: "WISHLIST"`

**Expected Results**:
- ✅ JSON contains wishlist items with `"source": "WISHLIST"`
- ✅ Library items have `"source": "LIBRARY"`
- ✅ Wishlist items have `userRating` (likely 0 for unrated)
- ✅ Wishlist items have `status` (likely "Not Started")
- ✅ `summary.wishlistCount` matches number of wishlist items
- ✅ `summary.libraryCount` matches number of library items

**Test Data**: Wishlist with 3+ items

---

### Scenario 5: Large Library Performance

**Objective**: Verify extension completes scraping in <1 minute for 100 titles.

**User Story**: User Story 1 (Extract User-Specific Library Data)

**Steps**:
1. Navigate to `https://www.audible.com/library` (account with 100+ books)
2. Note current time
3. Click "Start Sync" in extension overlay
4. Monitor progress indicator
5. Note time when "Download JSON" button appears
6. Calculate duration
7. Download JSON and verify completeness

**Expected Results**:
- ✅ Scraping completes in <60 seconds (Success Criteria SC-001)
- ✅ Progress indicator shows page count (e.g., "Scraping library page 2 of 5")
- ✅ All 100+ titles appear in JSON
- ✅ `summary.scrapeDurationMs` is <60000 milliseconds
- ✅ No HTTP requests to `/pd/ASIN` URLs (verify in Network tab)
- ✅ Only library page URLs are fetched

**Test Data**: Library with 100+ books

**Performance Baseline**: Previous implementation took 10-15 minutes for 100 titles. New implementation should be 95% faster (<1 minute).

---

### Scenario 6: UI Simplification

**Objective**: Verify settings panel (rate limit slider, current page only checkbox) is removed.

**User Story**: User Story 3 (Remove Configuration UI)

**Steps**:
1. Navigate to `https://www.audible.com/library`
2. Verify extension overlay appears
3. Inspect overlay UI elements

**Expected Results**:
- ✅ Overlay shows only "Start Sync" button (initially)
- ✅ No rate limit slider visible
- ✅ No "Current Page Only" checkbox visible
- ✅ No settings panel or gear icon
- ✅ After scraping: "Download JSON" button appears
- ✅ Total button count ≤ 2 (Start Sync, Download JSON)

**Test Data**: Any library page

---

### Scenario 7: Error Handling - Not Logged In

**Objective**: Verify clear error message when user is not logged in to Audible.

**User Story**: User Story 4 (Simplified Error Handling)

**Steps**:
1. Log out of Audible account
2. Navigate to `https://www.audible.com/library` (should redirect to login)
3. Extension overlay should still appear
4. Click "Start Sync"

**Expected Results**:
- ✅ Error message displays: "Not logged in to Audible. Please log in and try again."
- ✅ "Retry" and "Cancel" buttons appear
- ✅ Scraping does not start
- ✅ No network requests attempted

**Test Data**: Logged-out Audible account

---

### Scenario 8: Error Handling - Network Failure

**Objective**: Verify retry/cancel functionality when network error occurs.

**User Story**: User Story 4 (Simplified Error Handling)

**Steps**:
1. Navigate to `https://www.audible.com/library`
2. Click "Start Sync"
3. During scraping, open DevTools → Network tab → Throttling → Offline
4. Wait for error to occur

**Expected Results**:
- ✅ Error message displays (e.g., "Network error - retrying...")
- ✅ "Retry" and "Cancel" buttons appear
- ✅ Click "Retry" → scraping restarts from beginning
- ✅ Click "Cancel" → overlay resets to initial "Start Sync" state
- ✅ No partial data retained after cancel

**Test Data**: Any library page, simulated network failure

---

### Scenario 9: JSON Schema Validation

**Objective**: Verify output JSON conforms to schema in `contracts/extension-output.schema.json`.

**User Story**: All user stories (data integrity)

**Steps**:
1. Navigate to `https://www.audible.com/library`
2. Click "Start Sync" and download JSON
3. Copy JSON content
4. Visit https://www.jsonschemavalidator.net/
5. Paste schema from `specs/003-simplify-extension/contracts/extension-output.schema.json` into left panel
6. Paste downloaded JSON into right panel
7. Verify validation passes

**Expected Results**:
- ✅ No validation errors
- ✅ All required fields present: `asin`, `title`, `userRating`, `status`, `source`
- ✅ `userRating` is integer 0-5
- ✅ `status` matches one of: "Finished", "Not Started", or /\d+h \d+m left/
- ✅ `source` is "LIBRARY" or "WISHLIST"
- ✅ `summary` fields present and correctly typed

**Test Data**: Any JSON output from extension

---

### Scenario 10: Pagination Handling

**Objective**: Verify extension automatically detects and scrapes all library pages.

**User Story**: User Story 1 (Extract User-Specific Library Data)

**Steps**:
1. Navigate to `https://www.audible.com/library` (account with 50+ books requiring pagination)
2. Note total book count from Audible UI (e.g., "1-50 of 127 results")
3. Click "Start Sync" in extension overlay
4. Monitor progress indicator showing page numbers
5. Download JSON after completion
6. Count titles in `titleCatalog` array

**Expected Results**:
- ✅ Progress shows "Scraping library page X of Y"
- ✅ All pages are scraped (Y matches expected page count)
- ✅ Total titles in JSON matches Audible's total count
- ✅ No duplicate ASINs in output (same source)
- ✅ Automatic pagination (no user interaction needed)

**Test Data**: Library with 50+ books (multi-page)

---

### Scenario 11: Edge Case - CAPTCHA Detection

**Objective**: Verify extension handles CAPTCHA gracefully.

**User Story**: User Story 4 (Simplified Error Handling)

**Steps**:
1. (If possible) Trigger CAPTCHA by rapid page refreshes on Audible
2. Navigate to `https://www.audible.com/library` with CAPTCHA present
3. Click "Start Sync"

**Expected Results**:
- ✅ Error message displays: "CAPTCHA detected. Solve CAPTCHA on Audible page and click Retry."
- ✅ "Retry" and "Cancel" buttons appear
- ✅ After solving CAPTCHA, click "Retry" → scraping succeeds
- ✅ No crash or infinite loop

**Test Data**: CAPTCHA-protected Audible page (difficult to trigger on demand)

**Note**: This scenario may be difficult to test consistently. Document expected behavior for future reference.

---

### Scenario 12: Edge Case - Empty Library

**Objective**: Verify extension handles empty library gracefully.

**User Story**: User Story 1 (Extract User-Specific Library Data)

**Steps**:
1. Use test account with empty library (0 books)
2. Navigate to `https://www.audible.com/library`
3. Click "Start Sync"

**Expected Results**:
- ✅ Scraping completes immediately (<1 second)
- ✅ JSON contains empty `titleCatalog: []`
- ✅ `summary.libraryCount: 0`
- ✅ `summary.wishlistCount: 0`
- ✅ No errors logged
- ✅ Success message or "No titles found" message

**Test Data**: Empty library

---

## Validation Checklist

After running all scenarios, verify:

### Functional Requirements Validation

- [ ] **FR-001**: Extension scrapes library for ASIN, title, user rating, listening status ✅
- [ ] **FR-002**: User rating extracted from `data-star-count` attribute ✅
- [ ] **FR-003**: Listening status extracted from DOM (Finished, Not Started, time remaining) ✅
- [ ] **FR-004**: No store page fetches (`/pd/ASIN` URLs) ✅
- [ ] **FR-005**: Wishlist scraped for same data points ✅
- [ ] **FR-006**: Wishlist entries flagged with `source: "WISHLIST"` ✅
- [ ] **FR-007**: Rate limit slider removed from UI ✅
- [ ] **FR-008**: "Current Page Only" checkbox removed from UI ✅
- [ ] **FR-009**: Retry and Cancel buttons appear on errors ✅
- [ ] **FR-010**: No progress persistence across refreshes ✅
- [ ] **FR-011**: JSON output has simplified 5-field schema ✅
- [ ] **FR-012**: Library scraping completes in <1 minute for 100 titles ✅
- [ ] **FR-013**: Automatic pagination detection and scraping ✅

### Success Criteria Validation

- [ ] **SC-001**: Export library in <1 minute (100 titles) ✅
- [ ] **SC-002**: UI has ≤2 buttons (Start Sync, Download JSON) ✅
- [ ] **SC-003**: 95% faster scraping (vs previous implementation) ✅
- [ ] **SC-004**: 95% fewer HTTP requests (vs previous implementation) ✅
- [ ] **SC-005**: 50% code complexity reduction ✅
- [ ] **SC-006**: 80% smaller JSON payload ✅
- [ ] **SC-007**: First-time user completes export in <30 seconds ✅
- [ ] **SC-008**: Error recovery requires 1 click (Retry button) ✅
- [ ] **SC-009**: 100% of titles include accurate user rating ✅
- [ ] **SC-010**: 100% of titles include accurate listening status ✅

---

## Troubleshooting

### Extension Not Loading

**Symptom**: Extension doesn't appear in Chrome extensions list.

**Solution**:
- Verify manifest.json is valid (no syntax errors)
- Check Chrome console for extension errors (`chrome://extensions/` → Details → Errors)
- Ensure all referenced files exist in package directory

### Overlay Not Appearing

**Symptom**: Extension loaded but overlay doesn't show on library page.

**Solution**:
- Verify you're on `https://www.audible.com/library*` or `https://www.audible.com/wl*`
- Check browser console for JavaScript errors
- Verify `content-script.js` is injected (Sources tab in DevTools)

### Data Extraction Failures

**Symptom**: JSON output missing user ratings or listening status.

**Solution**:
- Inspect library page DOM structure - Audible may have changed selectors
- Check console for extraction warnings
- Verify `data-star-count` attribute exists on rating elements
- Verify time remaining elements have correct IDs (`time-remaining-finished-{ASIN}`)

### Performance Issues

**Symptom**: Scraping takes >1 minute for 100 titles.

**Solution**:
- Verify no store page fetches occurring (check Network tab)
- Check for CAPTCHA challenges causing delays
- Verify rate limiter is not over-throttling (should be ~10 req/sec for library pages)

---

## Next Steps

After completing quickstart testing:

1. **Document Results**: Record which scenarios passed/failed
2. **Log Issues**: Create GitHub issues for any failed scenarios
3. **Iterate**: Fix issues and re-test failed scenarios
4. **Performance Baseline**: Record actual scraping times for 100, 200, 500 titles
5. **User Acceptance**: Have test users validate simplified UX

---

## Additional Resources

- **JSON Schema Validator**: https://www.jsonschemavalidator.net/
- **Chrome Extension DevTools**: `chrome://extensions/` → Details → Inspect views
- **Network Monitoring**: DevTools → Network tab (filter by "audible.com")
- **DOM Inspection**: DevTools → Elements tab (find library row elements)
