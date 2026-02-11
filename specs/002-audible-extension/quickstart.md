# Quickstart: Manual Testing Guide

**Feature**: Audible Library Extension
**Date**: 2026-02-11
**Purpose**: Manual testing scenarios for validating extension functionality without automated tests

## Prerequisites

- Google Chrome (or Chromium-based browser) version 88+ with Manifest V3 support
- Active Audible.com account with at least one title in library
- Extension installed as "unpacked extension" (developer mode)

## Installation

1. **Enable Developer Mode** in Chrome:
   - Navigate to `chrome://extensions`
   - Toggle "Developer mode" in top-right corner

2. **Load Extension**:
   - Click "Load unpacked"
   - Select `packages/extension` directory
   - Extension should appear in extensions list

3. **Verify Installation**:
   - Extension icon should appear in Chrome toolbar
   - No errors in extensions page

## Test Scenario 1: Small Library Scraping (P1 - MVP)

**Objective**: Verify basic scraping and JSON download for a small library (10-50 titles)

**Prerequisites**:
- Logged into Audible.com
- Library has at least 10 titles

**Steps**:

1. Navigate to `https://www.audible.com/library`
2. Wait for page to fully load (all cover images visible)
3. Verify extension overlay appears in bottom-right corner:
   - Should show "Start Sync" button
   - Should be collapsible/expandable
4. Click "Start Sync" button
5. Observe progress updates:
   - Progress should show "Scraping library page 1 of X"
   - Progress should update as titles are scraped
   - Estimated time remaining should display
6. Wait for scraping to complete
7. Verify "Download JSON" button appears
8. Click "Download JSON"
9. Open downloaded file (filename: `audible-library-YYYY-MM-DD.json`)

**Expected Results**:
- ✅ JSON file downloads successfully
- ✅ File size is reasonable (typically 50-200KB for 10-50 titles)
- ✅ JSON is valid (can be parsed without errors)
- ✅ `summary.totalTitles` matches expected library size
- ✅ `titleCatalog` array contains all titles
- ✅ `userLibrary` array contains all titles with `source: "LIBRARY"`
- ✅ All titles have required fields: `asin`, `title`, `authors`, `narrators`, `coverImageUrl`
- ✅ At least 90% of titles have detailed metadata (duration, rating, summary)

**Pass Criteria**:
- JSON downloads without errors
- All titles from library page are present
- Required fields populated for all titles
- No console errors in browser DevTools

---

## Test Scenario 2: Large Library Pagination (P1 - MVP)

**Objective**: Verify pagination handling for libraries with 100+ titles

**Prerequisites**:
- Logged into Audible.com
- Library has 100+ titles (or simulate by setting pageSize=10 in URL)

**Steps**:

1. Navigate to `https://www.audible.com/library?pageSize=10` (to force pagination even with small library)
2. Start sync as in Scenario 1
3. Observe progress updates across multiple pages:
   - Should show "Scraping library page 1 of N"
   - Should progress through all pages sequentially
4. Verify no duplicate titles in final JSON:
   - Count unique ASINs in `titleCatalog`
   - Should equal `summary.totalTitles`

**Expected Results**:
- ✅ Extension handles pagination automatically
- ✅ Progress updates accurately reflect current page
- ✅ No duplicate ASINs in output
- ✅ Total titles count matches library size
- ✅ Scraping completes in reasonable time (200 titles in <5 minutes)

**Pass Criteria**:
- All pages scraped successfully
- No duplicates in final output
- Performance meets success criteria (SC-001: 200 titles in <5 min)

---

## Test Scenario 3: Wishlist Scraping (P2)

**Objective**: Verify wishlist titles are scraped and flagged correctly

**Prerequisites**:
- Logged into Audible.com
- Wishlist has at least 5 titles

**Steps**:

1. Navigate to `https://www.audible.com/library`
2. Start sync
3. Observe extension automatically navigates to wishlist:
   - May see "Scraping wishlist..." status
4. Complete sync and download JSON
5. Inspect `userLibrary` array:
   - Filter for `source: "WISHLIST"`

**Expected Results**:
- ✅ Wishlist titles present in `titleCatalog`
- ✅ Wishlist titles in `userLibrary` with `source: "WISHLIST"`
- ✅ Library titles have `source: "LIBRARY"`
- ✅ `summary.wishlistCount` matches expected count
- ✅ If title is in both library and wishlist, `source` is "LIBRARY" (library precedence)

**Pass Criteria**:
- Wishlist titles scraped successfully
- Source flags correct
- No titles lost or miscategorized

---

## Test Scenario 4: Rate Limiting (P2)

**Objective**: Verify rate limiting prevents overwhelming Audible servers

**Prerequisites**:
- Library has 50+ titles (to trigger sufficient requests)
- Browser DevTools Network tab open

**Steps**:

1. Navigate to `https://www.audible.com/library`
2. Open Chrome DevTools → Network tab
3. Start sync
4. Monitor network requests during store page scraping:
   - Should see requests to `audible.com/pd/` URLs
   - Time between requests should be ~100ms (10 req/sec default)

**Expected Results**:
- ✅ Requests are throttled to approximately 10 per second
- ✅ No burst patterns (all requests sent at once)
- ✅ No 429 (Too Many Requests) responses from Audible
- ✅ Extension completes successfully despite rate limiting

**Pass Criteria**:
- Rate limiting active and effective
- No rate limit errors from Audible
- Success criteria SC-003 met (no 429 errors with default settings)

---

## Test Scenario 5: Error Handling - Not Logged In (P2)

**Objective**: Verify extension detects authentication state and shows clear error

**Prerequisites**:
- Logged OUT of Audible.com

**Steps**:

1. Ensure logged out (navigate to `https://www.audible.com/library` should redirect to login)
2. If extension overlay appears, click "Start Sync"

**Expected Results**:
- ✅ Extension detects not logged in
- ✅ Error message displays: "Not logged in to Audible. Please log in and try again."
- ✅ No scraping attempts made
- ✅ User can dismiss error and log in

**Pass Criteria**:
- Clear, actionable error message
- No crashes or console errors
- Success criteria SC-005 met (clear error messages)

---

## Test Scenario 6: Error Handling - Network Failure (P2)

**Objective**: Verify graceful handling of network errors

**Prerequisites**:
- Logged into Audible.com
- Library has 10+ titles

**Steps**:

1. Navigate to `https://www.audible.com/library`
2. Start sync
3. **During scraping**, disconnect network (airplane mode or turn off WiFi)
4. Observe error handling:
   - Should see "Network error - retrying..." in overlay
5. Reconnect network after 5-10 seconds
6. Verify scraping resumes or retries

**Expected Results**:
- ✅ Extension detects network failure
- ✅ Shows clear error message
- ✅ Retries failed requests (up to 3 times with exponential backoff)
- ✅ Partial progress is saved
- ✅ User can resume or restart after network restored

**Pass Criteria**:
- Graceful error handling
- Retry mechanism works
- No data loss for successfully scraped titles

---

## Test Scenario 7: Pause/Resume (P2)

**Objective**: Verify user can pause mid-scrape and resume later

**Prerequisites**:
- Logged into Audible.com
- Library has 50+ titles (to allow time for pause)

**Steps**:

1. Navigate to `https://www.audible.com/library`
2. Start sync
3. Wait until progress shows 30-50% complete
4. **Close the browser tab** (not the entire browser)
5. Reopen `https://www.audible.com/library`
6. Verify extension overlay shows previous progress and offers "Resume" or "Start Fresh"
7. Click "Resume"
8. Verify scraping continues from where it left off

**Expected Results**:
- ✅ Progress is saved to chrome.storage.local
- ✅ Extension detects previous incomplete scrape
- ✅ User can choose to resume or start fresh
- ✅ Resume continues from last completed title (no duplicates)
- ✅ Final JSON contains complete data

**Pass Criteria**:
- Pause/resume works reliably
- No duplicate data from resumed scraping
- User has control over resume vs restart

---

## Test Scenario 8: Store Page Missing (P2)

**Objective**: Verify extension handles missing store pages gracefully

**Prerequisites**:
- Library has a title that redirects or has no store page (rare, but possible)
- Or simulate by blocking audible.com/pd/* URLs in DevTools Network tab

**Steps**:

1. Open Chrome DevTools → Network tab
2. Add network request blocking pattern: `*audible.com/pd/*`
3. Navigate to `https://www.audible.com/library`
4. Start sync
5. Observe behavior when store pages fail to load

**Expected Results**:
- ✅ Extension continues scraping despite store page failures
- ✅ Titles with missing store pages included with basic metadata
- ✅ `storePageMissing: true` flag set for affected titles
- ✅ Warning added to `summary.warnings` array
- ✅ Scraping completes successfully

**Pass Criteria**:
- Partial failures don't abort entire scrape
- Clear warnings for affected titles
- Success criteria SC-005 met (actionable error messages)

---

## Test Scenario 9: JSON Schema Validation (P1 - MVP)

**Objective**: Verify downloaded JSON conforms to schema

**Prerequisites**:
- JSON file from Test Scenario 1 or 2
- JSON Schema validator tool (e.g., https://www.jsonschemavalidator.net/)

**Steps**:

1. Open downloaded JSON file
2. Copy contents
3. Navigate to JSON Schema validator
4. Paste schema from `contracts/extension-output.schema.json`
5. Paste JSON data
6. Run validation

**Expected Results**:
- ✅ JSON validates successfully against schema
- ✅ No schema violations
- ✅ All required fields present
- ✅ Field types match schema definitions

**Pass Criteria**:
- 100% schema compliance (Success criteria SC-004)

---

## Test Scenario 10: Data Completeness Check (P1 - MVP)

**Objective**: Verify metadata extraction completeness

**Prerequisites**:
- JSON file from Test Scenario 1 or 2
- Sample of 10 known titles in library for manual verification

**Steps**:

1. Select 10 random titles from downloaded JSON
2. For each title, manually visit its store page on audible.com
3. Compare scraped data to actual store page data:
   - Title, authors, narrators match
   - Duration matches (±1 minute acceptable)
   - Rating matches (±0.1 acceptable)
   - Summary text present and accurate
   - Cover image URL valid

**Expected Results**:
- ✅ 95%+ of fields match store page data
- ✅ No critical errors (wrong title, wrong authors)
- ✅ Minor discrepancies acceptable (e.g., duration rounding, summary truncation)

**Pass Criteria**:
- Success criteria SC-002 met (95%+ metadata fields extracted)

---

## Performance Benchmarks

Based on success criteria from spec.md:

| Library Size | Expected Scrape Time | Pass/Fail Threshold |
|--------------|----------------------|---------------------|
| 50 titles    | < 2 minutes          | < 3 minutes = PASS  |
| 100 titles   | < 3 minutes          | < 4 minutes = PASS  |
| 200 titles   | < 5 minutes          | < 7 minutes = PASS  |
| 500 titles   | < 12 minutes         | < 15 minutes = PASS |

Time includes:
- Library page pagination
- Store page scraping (rate-limited to 10 req/sec)
- JSON normalization and download

**Note**: Times assume default rate limit (10 req/sec). Adjusting rate limit will affect times proportionally.

---

## Common Issues and Troubleshooting

### Issue: Extension overlay doesn't appear

**Check**:
- Are you on audible.com/library or audible.com/wl?
- Is extension installed and enabled in chrome://extensions?
- Check browser console for errors (F12 → Console tab)

**Fix**: Reload page, verify extension is active

### Issue: Scraping gets stuck at X%

**Check**:
- Network tab - are requests timing out?
- Is Audible showing CAPTCHA or bot detection?
- Check chrome.storage.local quota (Settings → Storage)

**Fix**: Close tab, reopen, try to resume. If CAPTCHA detected, solve manually and restart.

### Issue: JSON file is very small (< 10KB for 50+ titles)

**Check**:
- Open JSON in text editor - is data truncated?
- Check browser console for errors during scraping

**Fix**: Likely a scraping error. Check extension logs, try again.

### Issue: Missing metadata (no duration, no ratings)

**Check**:
- Are store pages accessible (navigate manually to audible.com/pd/ASIN)?
- Check `storePageMissing` flags in JSON

**Fix**: Some titles may genuinely have missing store pages. If > 10% affected, may indicate Audible blocking.

---

## Reporting Bugs

If you encounter issues during testing, report with:

1. **Scenario**: Which test scenario failed
2. **Expected**: What should have happened
3. **Actual**: What actually happened
4. **Browser**: Chrome version (chrome://version)
5. **Console Errors**: Copy from DevTools Console tab
6. **JSON Sample**: Sanitized sample of problematic output (remove personal info)

---

**Quickstart Complete**: All manual testing scenarios documented. Ready for implementation and testing.
