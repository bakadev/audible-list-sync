# Quickstart: Testing Guide

**Feature**: Extension Auto-Sync with Manual Upload Fallback
**Date**: 2026-02-12

## Overview

This guide provides step-by-step instructions for testing all three user stories of the extension auto-sync feature. Each scenario is designed to be independently testable and validates a specific user journey.

---

## Scenario 1: Happy Path Auto-Sync (P1)

**Goal**: Verify automatic library sync when user follows the primary workflow through the web application.

### Prerequisites

- ✅ User has account and is logged into web application
- ✅ Browser extension is installed and enabled
- ✅ User has titles in their Audible library (can be test data)
- ✅ Extension has library scraping functionality working
- ✅ Sync token generation endpoint is functional

### Step-by-Step Actions

1. **Navigate to Dashboard**
   - Open web application: `https://myaudiblelists.com/dashboard`
   - Verify user is logged in (see user name in header)

2. **Trigger Sync Flow**
   - Click "Update Library" or "Sync Library" button
   - **Expected**: Page redirects to Audible.com with sync token in URL
   - **Verify**: URL contains `?syncToken=eyJ...` parameter

3. **Extension Detection**
   - Extension content script runs on Audible page
   - **Expected**: Extension detects sync token from URL
   - **Verify**: Console log shows "Sync token detected: eyJ..."

4. **Library Scraping**
   - Extension scrapes library data (existing functionality)
   - **Expected**: Extension shows progress (e.g., "Scanning library...")
   - **Verify**: Extension popup/overlay shows scraping status

5. **Automatic POST**
   - Extension automatically POSTs library data to API
   - **Expected**: No manual intervention required
   - **Verify**: Network tab shows POST to `/api/sync/import` with Authorization header

6. **Success Response**
   - API processes import and returns success
   - **Expected**: Extension shows success message
   - **Verify**: Message shows "Sync Complete! Successfully synced X titles to your library"

7. **Navigate Back to App**
   - User clicks "View Library" button in success message
   - **Expected**: Redirected to `https://myaudiblelists.com/library`
   - **Verify**: Library page shows newly synced titles

### Expected Outcomes

- ✅ Token detected automatically
- ✅ Library data posted to API without manual steps
- ✅ Import completed successfully
- ✅ Success message displayed with import stats
- ✅ Library page shows updated titles
- ✅ Sync token marked as "used" in database

### Validation Checkpoints

**Database**:
```sql
-- Verify sync token was used
SELECT * FROM "SyncToken" WHERE jti = '<token_jti>' AND used = true;

-- Verify library entries created
SELECT COUNT(*) FROM "LibraryEntry" WHERE "userId" = '<user_id>';

-- Verify titles added to catalog
SELECT COUNT(*) FROM "Title"
WHERE asin IN (SELECT "titleAsin" FROM "LibraryEntry" WHERE "userId" = '<user_id>');
```

**Browser DevTools**:
- Network tab shows `POST /api/sync/import` with 200 response
- Console shows no JavaScript errors
- Response body contains `{ "success": true, "imported": X }`

**User Experience**:
- Entire flow completes in <30 seconds for typical library
- No manual steps required after clicking "Update Library"
- Clear feedback at each step

---

## Scenario 2: No Token Fallback (P2)

**Goal**: Verify extension handles missing sync token gracefully and provides helpful guidance to users.

### Prerequisites

- ✅ Browser extension is installed and enabled
- ✅ User navigates to Audible directly (not through web app redirect)
- ✅ Extension has library scraping functionality working

### Step-by-Step Actions

1. **Navigate Directly to Audible**
   - Open browser and go to `https://audible.com/library` directly
   - **Do NOT** click through web application's "Update Library" button
   - **Expected**: URL has NO `syncToken` parameter

2. **Run Extension**
   - Extension content script runs automatically or user triggers manually
   - **Expected**: Extension scrapes library data as normal
   - **Verify**: Extension shows "Scanning library..." progress

3. **Token Check**
   - Extension completes scraping and checks for token
   - **Expected**: No token found in URL
   - **Verify**: Console log shows "No sync token detected"

4. **Fallback UI Display**
   - Extension shows "No sync token found" message
   - **Expected**: Clear message explaining what happened
   - **Verify**: Message contains:
     - "No sync token found"
     - Explanation of options
     - Two action buttons

5. **Option 1: Download JSON**
   - User clicks "Download JSON" button
   - **Expected**: Browser downloads `audible-library.json` file
   - **Verify**: File contains scraped library data in correct format

6. **Option 2: Return to App**
   - User clicks "Return to My Audible Lists" button
   - **Expected**: Browser navigates to `https://myaudiblelists.com/library`
   - **Verify**: User lands on library page where they can trigger proper sync flow

### Expected Outcomes

- ✅ Extension handles missing token gracefully
- ✅ User sees clear, helpful message
- ✅ Two actionable options provided
- ✅ Download JSON option works correctly
- ✅ Return to app navigation works
- ✅ No errors or confusing behavior

### Validation Checkpoints

**Extension Behavior**:
- No attempt to POST to API without token
- No JavaScript errors in console
- Fallback UI displays immediately after scraping

**Downloaded JSON File**:
```json
{
  "titles": [
    {
      "asin": "B0FXBHJXPD",
      "title": "...",
      "authors": [...],
      "source": "LIBRARY",
      "dateAdded": "...",
      ...
    }
  ]
}
```

**User Message**:
```
No Sync Token Found

You navigated to Audible directly. To sync automatically:

1. Return to My Audible Lists
2. Click "Update Library"
3. Run the extension when redirected

Or download your library data as JSON and upload manually.

[Download JSON]  [Return to My Audible Lists]
```

---

## Scenario 3: Manual JSON Upload (P3)

**Goal**: Verify users can manually upload JSON files through the web application as an alternative sync method.

### Prerequisites

- ✅ User has account and is logged into web application
- ✅ User has downloaded JSON file from extension (from Scenario 2 or separate export)
- ✅ JSON file is valid and < 5MB

### Step-by-Step Actions

1. **Navigate to Library Page**
   - Open web application: `https://myaudiblelists.com/library`
   - **Expected**: User is logged in and sees library page
   - **Verify**: Manual upload UI component is visible

2. **Locate Upload Interface**
   - Scroll to find "Manual Upload" section
   - **Expected**: File input with label "Upload Library JSON"
   - **Verify**: Help text visible: "Upload a JSON export from the browser extension"

3. **Select File**
   - Click file input button
   - Select `audible-library.json` file from filesystem
   - **Expected**: File selected, filename displays
   - **Verify**: "Upload" button becomes enabled

4. **Initiate Upload**
   - Click "Upload" button
   - **Expected**: Button disables, loading spinner appears
   - **Verify**: Progress message shows "Uploading and processing..."

5. **Processing**
   - API receives file, parses JSON, processes import
   - **Expected**: Loading state persists during processing
   - **Verify**: Network tab shows POST to `/api/library/upload` in progress

6. **Success Response**
   - API completes processing and returns success
   - **Expected**: Success message displays
   - **Verify**: Message shows "Successfully imported X titles (Y new to catalog)"

7. **Library Refresh**
   - Library page content updates automatically
   - **Expected**: Newly imported titles appear in library
   - **Verify**: Title count matches import stats

8. **Upload Reset**
   - Upload component resets to idle state
   - **Expected**: File input cleared, can upload again if needed
   - **Verify**: "Upload" button is back to initial state

### Expected Outcomes

- ✅ File upload completes successfully
- ✅ JSON is parsed and validated
- ✅ Import logic processes all titles
- ✅ Success message shows accurate stats
- ✅ Library page updates with new titles
- ✅ Upload interface resets for potential reuse

### Validation Checkpoints

**API Request**:
```http
POST /api/library/upload HTTP/1.1
Content-Type: multipart/form-data
Cookie: next-auth.session-token=...

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="audible-library.json"
Content-Type: application/json

{...JSON content...}
```

**API Response**:
```json
{
  "success": true,
  "imported": 247,
  "newToCatalog": 12,
  "libraryCount": 230,
  "wishlistCount": 17,
  "warnings": []
}
```

**Database**:
```sql
-- Verify library entries created
SELECT COUNT(*) FROM "LibraryEntry"
WHERE "userId" = '<user_id>'
AND "createdAt" > NOW() - INTERVAL '1 minute';

-- Verify no sync token was used (manual upload doesn't use tokens)
SELECT * FROM "SyncToken"
WHERE "userId" = '<user_id>'
ORDER BY "createdAt" DESC
LIMIT 1;
-- Should show last token as either unused or from a previous auto-sync
```

**UI State**:
- Loading spinner visible during processing
- Success toast/alert appears after completion
- Library grid updates with new titles
- No errors in browser console

---

## Error Scenarios

### Token Expiration

**Setup**: Wait 16+ minutes after generating sync token before running extension

**Expected**:
- Extension POSTs to API with expired token
- API returns 401 "Invalid or expired token"
- Extension shows: "Sync token expired. Return to app to generate a new token."
- User can click button to navigate back to app

**Validation**: Token marked as expired in database, no library entries created

### Token Reuse (Replay Attack)

**Setup**: Complete one successful auto-sync, then reload page (token still in URL)

**Expected**:
- Extension attempts POST with already-used token
- API returns 401 "Token already used"
- Extension shows: "This sync token has already been used. Return to app for a new token."

**Validation**: `SyncToken.used = true`, no duplicate imports

### Invalid File Upload

**Setup**: Upload a .txt file renamed to .json

**Expected**:
- Client validates file extension
- Error message: "Invalid file type. Please upload a .json file"
- Upload button remains disabled

**Validation**: No API request made, no data imported

### Malformed JSON Upload

**Setup**: Upload JSON file with syntax error

**Expected**:
- API receives file but fails to parse
- API returns 400 "Invalid JSON format"
- UI shows: "File format invalid. Please download a fresh export from the extension."

**Validation**: No database changes, error logged

### Network Failure During Auto-Sync

**Setup**: Disable internet or use network throttling during auto-sync

**Expected**:
- Fetch request fails with network error
- Extension shows: "Failed to sync. Check your internet connection."
- Retry button available

**Validation**: No data sent to server, can retry when connection restored

---

## Performance Benchmarks

### Auto-Sync Performance

| Library Size | Expected Time | Acceptable Range |
|--------------|---------------|------------------|
| 1-50 titles | <5 seconds | <10 seconds |
| 51-100 titles | 5-10 seconds | <15 seconds |
| 101-250 titles | 10-20 seconds | <30 seconds |
| 251-500 titles | 20-30 seconds | <60 seconds |

### Manual Upload Performance

| File Size | Expected Time | Acceptable Range |
|-----------|---------------|------------------|
| <1MB | <5 seconds | <10 seconds |
| 1-3MB | 5-15 seconds | <30 seconds |
| 3-5MB | 15-30 seconds | <60 seconds |

---

## Test Data

### Sample JSON File (Small Library)

```json
{
  "titles": [
    {
      "asin": "B0FXBHJXPD",
      "title": "Rise of the Cheat Potion Maker Omnibus: Books 1-3",
      "authors": ["Kurtis Eckstein"],
      "source": "LIBRARY",
      "dateAdded": "2026-01-15T10:30:00Z",
      "listeningProgress": 45,
      "personalRating": 5
    },
    {
      "asin": "B08G9PRS1K",
      "title": "Dungeon Crawler Carl",
      "authors": ["Matt Dinniman"],
      "source": "WISHLIST",
      "dateAdded": "2026-02-01T14:20:00Z",
      "listeningProgress": 0,
      "personalRating": null
    }
  ]
}
```

### Generate Larger Test Data

```javascript
// Generate JSON with N titles for performance testing
function generateTestData(count) {
  const titles = []
  for (let i = 0; i < count; i++) {
    titles.push({
      asin: `B${String(i).padStart(9, '0')}`,
      title: `Test Book ${i}`,
      authors: [`Test Author ${i % 100}`],
      source: i % 10 === 0 ? "WISHLIST" : "LIBRARY",
      dateAdded: new Date().toISOString(),
      listeningProgress: Math.floor(Math.random() * 101),
      personalRating: Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : null
    })
  }
  return { titles }
}

// Usage: Save to file
const data = generateTestData(500)
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
// Download blob as 'test-library-500.json'
```

---

## Troubleshooting

### Extension Not Detecting Token

**Symptoms**: Extension runs but doesn't auto-sync even with token in URL

**Checks**:
1. Verify token in URL: `console.log(new URLSearchParams(window.location.search).get('syncToken'))`
2. Check extension content script loaded: DevTools > Console > look for extension logs
3. Verify extension has permission to run on Audible.com

**Solution**: Reload page, check extension permissions, verify URL parameter

### Upload Stuck in Loading State

**Symptoms**: Upload shows spinner indefinitely, never completes

**Checks**:
1. Network tab: Check if request is pending or failed
2. Console: Look for JavaScript errors
3. File size: Verify file is under 5MB

**Solution**: Refresh page, try smaller file, check network connectivity

### Library Not Updating After Sync

**Symptoms**: Sync succeeds but library page shows old data

**Checks**:
1. Database: Verify LibraryEntry records created
2. Browser cache: Hard refresh (Ctrl+Shift+R)
3. Session: Verify user is logged in with correct account

**Solution**: Refresh page, log out and back in, check database directly

---

## Summary

All three user stories have clear, step-by-step test scenarios with validation checkpoints. Testing can be done independently for each story:

- **P1 (Auto-Sync)**: Primary workflow, highest value, test first
- **P2 (Fallback UI)**: Edge case handling, test with direct Audible navigation
- **P3 (Manual Upload)**: Alternative path, test with downloaded JSON file

Each scenario includes prerequisites, actions, expected outcomes, and validation queries to verify correct behavior.
