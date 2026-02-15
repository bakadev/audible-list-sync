# Contract: Extension Auto-Sync

**Feature**: Extension Auto-Sync with Manual Upload Fallback
**Contract Type**: Extension → API Interaction
**Date**: 2026-02-12

## Overview

This contract defines the interaction between the browser extension and the web application API when a sync token is present. The extension automatically detects the token, scrapes the user's library, and POSTs the data to the sync import endpoint without requiring manual intervention.

## Endpoint

**URL**: `POST https://myaudiblelists.com/api/sync/import`
**Existing Endpoint**: Yes (reused, no changes)
**New Behavior**: Extension automatically invokes this endpoint when token detected in URL

## Authentication

**Method**: Bearer token (sync token)
**Header**: `Authorization: Bearer <sync_token>`

**Token Source**: URL query parameter `syncToken`
- Example: `https://audible.com/library?syncToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Extension reads token from `window.location.search`
- Token passed in Authorization header when posting to API

**Token Validation** (existing logic, unchanged):
- Must not be expired
- Must not have been used previously (single-use)
- Must match user ID from JWT payload
- Automatically marked as `used=true` after successful import

## Request Format

### HTTP Request

```http
POST /api/sync/import HTTP/1.1
Host: myaudiblelists.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Content-Length: [length]

{
  "titles": [...]
}
```

### Request Body Schema

```typescript
interface ExtensionSyncRequest {
  titles: ImportTitle[]
}

interface ImportTitle {
  // Required fields
  asin: string                    // Amazon Standard Identification Number
  title: string                   // Book title
  authors: string[]               // List of author names
  source: "LIBRARY" | "WISHLIST"  // Where the title exists
  dateAdded: string               // ISO date when added to user's library

  // Optional fields
  subtitle?: string | null
  narrators?: string[]
  seriesName?: string | null
  seriesPosition?: number | null
  duration?: number | null        // Runtime in minutes
  coverImageUrl?: string | null
  summary?: string | null
  rating?: number | null          // Audible rating (0-5)
  ratingCount?: number | null     // Number of ratings
  publisher?: string | null
  releaseDate?: string | null     // ISO date
  language?: string | null
  categories?: string[]           // Genre/category tags
  listeningProgress?: number      // Percentage complete (0-100)
  personalRating?: number | null  // User's rating (0-5)
}
```

### Example Request

```json
{
  "titles": [
    {
      "asin": "B0FXBHJXPD",
      "title": "Rise of the Cheat Potion Maker Omnibus: Books 1-3",
      "subtitle": null,
      "authors": ["Kurtis Eckstein"],
      "narrators": ["Andrea Parsneau"],
      "seriesName": "Rise of the Cheat Potion Maker",
      "seriesPosition": 1.0,
      "duration": 2538,
      "coverImageUrl": "https://m.media-amazon.com/images/I/91C-ac5K-rL.jpg",
      "summary": "Three Volumes in a single offering! In a blink, I found myself...",
      "rating": 4.6,
      "ratingCount": 8234,
      "publisher": "Royal Guard Publishing LLC",
      "releaseDate": "2025-11-03",
      "language": "english",
      "categories": ["Science Fiction & Fantasy", "GameLit"],
      "source": "LIBRARY",
      "listeningProgress": 45,
      "personalRating": 5,
      "dateAdded": "2026-01-15T10:30:00Z"
    }
  ]
}
```

## Response Format

### Success Response (200 OK)

```typescript
interface SyncImportResponse {
  success: boolean
  imported: number         // Total titles processed
  newToCatalog: number     // Titles added to shared catalog
  libraryCount: number     // Titles from LIBRARY source
  wishlistCount: number    // Titles from WISHLIST source
  warnings: string[]       // Non-fatal issues (e.g., "Failed to fetch metadata for ASIN X")
}
```

### Example Success Response

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

### Error Responses

#### 401 Unauthorized - Missing/Invalid Token

```json
{
  "error": "Missing or invalid Authorization header"
}
```

```json
{
  "error": "Invalid or expired token"
}
```

```json
{
  "error": "Token already used"
}
```

#### 400 Bad Request - Invalid Payload

```json
{
  "error": "Invalid JSON payload"
}
```

```json
{
  "error": "Missing or invalid titles array"
}
```

```json
{
  "error": "Title at index 5 missing required field: asin"
}
```

#### 413 Payload Too Large

```json
{
  "error": "Payload too large (max 50MB)"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error during import"
}
```

## Extension Behavior

### Token Detection

```typescript
// On page load or content script injection
function detectSyncToken(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('syncToken')
}
```

### Auto-Sync Trigger

1. Extension completes library scraping
2. Check for sync token in URL
3. If token present:
   - Show "Syncing to My Audible Lists..." message
   - POST library data to API with token
   - Display result (success or error)
4. If no token:
   - Show "No sync token found" fallback message (see Contract 2)

### Success Handling

```typescript
// After successful POST
showMessage({
  type: 'success',
  title: 'Sync Complete!',
  message: `Successfully synced ${response.imported} titles to your library.`,
  actions: [
    { label: 'View Library', url: 'https://myaudiblelists.com/library' },
    { label: 'Close', action: 'dismiss' }
  ]
})
```

### Error Handling

| Error Type | User-Facing Message | Action |
|------------|---------------------|---------|
| Network Error | "Failed to sync. Check your internet connection." | Retry button |
| 401 (Token Expired) | "Sync token expired. Return to app to generate a new token." | "Return to App" button |
| 401 (Token Used) | "This sync token has already been used. Return to app for a new token." | "Return to App" button |
| 400 (Invalid Data) | "Failed to sync: Invalid data format. Please try again." | Retry button |
| 413 (Too Large) | "Library too large to sync. Please contact support." | "Contact Support" button |
| 500 (Server Error) | "Server error during sync. Please try again later." | Retry button |

## Testing Scenarios

### Happy Path

**Given**:
- User clicks "Update Library" in web application
- User is redirected to Audible with valid sync token in URL
- Extension is installed and active

**When**:
- Extension completes library scraping
- Extension detects token and auto-POSTs to API

**Then**:
- API returns 200 with import stats
- Extension shows "Sync Complete!" success message
- User can navigate back to view updated library

### Token Expiration

**Given**:
- User is redirected to Audible with sync token
- User waits >15 minutes before extension runs

**When**:
- Extension POSTs to API with expired token

**Then**:
- API returns 401 "Invalid or expired token"
- Extension shows expiration message
- User can return to app to generate new token

### Token Reuse (Replay Attack Prevention)

**Given**:
- User completes one successful sync
- User manually reloads page (same token still in URL)

**When**:
- Extension runs again and POSTs with same token

**Then**:
- API returns 401 "Token already used"
- Extension shows reuse error message
- User must return to app for new token

### Network Failure

**Given**:
- User is on Audible with valid token
- User has poor/intermittent network connection

**When**:
- Extension POSTs to API but request fails

**Then**:
- Extension shows network error message
- Extension provides retry button
- User can retry when connection restored

## Security Considerations

- **Single-Use Tokens**: Prevents replay attacks
- **Short Expiration**: Limits attack window (typically 15 minutes)
- **HTTPS Only**: All communication over secure channel
- **No Credential Storage**: Extension never stores user credentials
- **Origin Validation**: API validates request origin
- **CORS Configuration**: API allows requests only from extension origin

## Performance Expectations

- **POST Request**: Complete within 5 seconds for typical libraries (<100 titles)
- **Large Libraries**: May take up to 30 seconds for 500+ titles (acceptable UX)
- **Timeout**: Extension implements 60-second timeout, shows error if exceeded
- **Retry Logic**: No automatic retry (user must manually retry on error)

## Dependencies

**Extension**:
- Existing library scraper functionality
- URLSearchParams API
- Fetch API

**API**:
- Existing `/api/sync/import` endpoint
- SyncToken validation logic
- Audnex API integration
- Database (Prisma + PostgreSQL)

## Future Enhancements (Out of Scope)

- Progress indicator during sync (currently shows spinner only)
- Partial sync (currently full-replace only)
- Offline queue (sync when connection restored)
- Background sync (currently manual trigger only)
