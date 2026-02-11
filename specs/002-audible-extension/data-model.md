# Data Model: Extension JSON Output Schema

**Feature**: Audible Library Extension
**Date**: 2026-02-11
**Purpose**: Define the canonical JSON format produced by the extension for download and future API upload

## Overview

The extension generates a single JSON file containing:
1. **Metadata**: Sync timestamp, user info, summary statistics
2. **Title Catalog**: Array of audiobook metadata (ASIN-keyed, normalized)
3. **User Library**: Array of user-specific entries (references titles by ASIN, includes personal metadata)

This format aligns with the website's database schema (Title Catalog + User Library separation) for future API upload compatibility.

---

## Root Schema

```json
{
  "syncedAt": "2026-02-11T14:30:00.000Z",
  "userId": "user@example.com",  // Optional: Audible email if detectable
  "summary": {
    "totalTitles": 247,
    "libraryCount": 235,
    "wishlistCount": 12,
    "scrapeDurationMs": 180000,
    "warnings": []
  },
  "titleCatalog": [...],  // Array of Title objects
  "userLibrary": [...]    // Array of UserLibraryEntry objects
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `syncedAt` | ISO 8601 String | ✅ | Timestamp when scrape completed |
| `userId` | String | ❌ | Audible account email (if detectable from page) |
| `summary` | Object | ✅ | Aggregate statistics |
| `summary.totalTitles` | Number | ✅ | Total unique titles scraped |
| `summary.libraryCount` | Number | ✅ | Titles from library (owned/Plus) |
| `summary.wishlistCount` | Number | ✅ | Titles from wishlist |
| `summary.scrapeDurationMs` | Number | ✅ | Time elapsed for scrape (milliseconds) |
| `summary.warnings` | Array<String> | ✅ | Non-fatal errors (e.g., "Store page missing for ASIN: B001ABC") |
| `titleCatalog` | Array<Title> | ✅ | All unique audiobooks |
| `userLibrary` | Array<UserLibraryEntry> | ✅ | User's relationship to each title |

---

## Title Entity (Catalog Entry)

Represents an audiobook in the Audible catalog. This is the **normalized metadata** shared across all users.

```json
{
  "asin": "B001ABC123",
  "title": "The Great Gatsby",
  "subtitle": "A Novel",
  "authors": ["F. Scott Fitzgerald"],
  "narrators": ["Jake Gyllenhaal"],
  "series": {
    "name": "Classic American Literature",
    "position": "1"
  },
  "duration": 287,
  "publisher": "Recorded Books",
  "releaseDate": "2013-06-15",
  "categories": ["Fiction", "Classics", "Literary Fiction"],
  "language": "en",
  "summary": "The story of the mysteriously wealthy Jay Gatsby...",
  "coverImageUrl": "https://m.media-amazon.com/images/I/51Abc123._SL500_.jpg",
  "rating": 4.5,
  "ratingCount": 12543,
  "plusCatalog": false,
  "whispersync": "available",
  "storePageMissing": false
}
```

### Fields

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `asin` | String | ✅ | Library page `[data-asin]` | Audible Standard Item Number (unique ID) |
| `title` | String | ✅ | Store page JSON-LD `name` or DOM `[slot="title"]` | Main title |
| `subtitle` | String | ❌ | Store page DOM `[slot="subtitle"]` | Subtitle (not in JSON-LD) |
| `authors` | Array<String> | ✅ | Library page `.authorLabel a` or store page JSON-LD | Author names |
| `narrators` | Array<String> | ✅ | Library page `.narratorLabel a` or store page JSON-LD | Narrator names |
| `series` | Object | ❌ | Store page JSON-LD `series` array | Series info (if part of series) |
| `series.name` | String | ✅ | JSON-LD `series[0].name` | Series title |
| `series.position` | String | ✅ | JSON-LD `series[0].part` | Book number(s) in series (e.g., "1", "1-3") |
| `duration` | Number | ❌ | Store page JSON-LD `duration` (ISO 8601 → minutes) | Total audiobook length in minutes |
| `publisher` | String | ❌ | Store page JSON-LD `publisher[0]` | Publisher name |
| `releaseDate` | String | ❌ | Store page JSON-LD `datePublished` | ISO 8601 date |
| `categories` | Array<String> | ❌ | Store page JSON-LD `itemListElement` | Breadcrumb categories |
| `language` | String | ❌ | Store page JSON-LD `inLanguage` | Language code (e.g., "en", "es") |
| `summary` | String | ❌ | Store page JSON-LD `description` | Book description/blurb |
| `coverImageUrl` | String | ✅ | Library page `img.bc-image-inset-border` | Full cover art URL |
| `rating` | Number | ❌ | Store page JSON-LD `aggregateRating.ratingValue` | Average rating (0-5, 1 decimal) |
| `ratingCount` | Number | ❌ | Store page JSON-LD `aggregateRating.ratingCount` | Number of ratings |
| `plusCatalog` | Boolean | ❌ | Library page `input[value="AudibleDiscovery"]` | From Plus Catalog |
| `whispersync` | String | ❌ | Store page JSON-LD `listeningEnhancements` or DOM `.ws4vLabel` | "available", "owned", or null |
| `storePageMissing` | Boolean | ❌ | Scraper detection | True if store page couldn't be fetched |

### Validation Rules

- **ASIN**: REQUIRED, must match pattern `/^B[0-9A-Z]{9}$/` (e.g., "B001ABC123")
- **title**: REQUIRED, min length 1
- **authors**: REQUIRED, min length 1 (array must have at least one author)
- **narrators**: REQUIRED, min length 1 (array must have at least one narrator)
- **duration**: If present, must be positive integer (minutes)
- **rating**: If present, must be between 0 and 5 (inclusive)
- **releaseDate**: If present, must be valid ISO 8601 date string
- **whispersync**: If present, must be one of: "available", "owned", null

---

## UserLibraryEntry Entity

Represents the user's relationship to a title. References Title by ASIN. Contains **user-specific metadata** only.

```json
{
  "asin": "B001ABC123",
  "source": "LIBRARY",
  "personalRating": 5,
  "listeningProgress": 65,
  "dateAdded": "2023-08-15T12:00:00.000Z"
}
```

### Fields

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `asin` | String | ✅ | References Title | Foreign key to Title in catalog |
| `source` | String | ✅ | Page type | "LIBRARY" or "WISHLIST" |
| `personalRating` | Number | ❌ | Library page `[data-star-count]` | User's rating (0-5, integer) |
| `listeningProgress` | Number | ❌ | Library page `[role="progressbar"]` aria-valuenow | Progress percentage (0-100) |
| `dateAdded` | String | ❌ | Library page (if available) | ISO 8601 timestamp when added to library |

### Validation Rules

- **asin**: REQUIRED, must exist in titleCatalog array
- **source**: REQUIRED, must be exactly "LIBRARY" or "WISHLIST"
- **personalRating**: If present, must be integer 0-5
- **listeningProgress**: If present, must be integer 0-100
- **dateAdded**: If present, must be valid ISO 8601 timestamp

---

## Data Normalization Rules

### Title Deduplication

If the same ASIN appears in both library and wishlist:
- Include in `titleCatalog` **once**
- Include in `userLibrary` **once** with `source: "LIBRARY"` (library takes precedence)

### Missing Store Pages

If store page fetch fails (404, CAPTCHA, timeout):
- Include title in `titleCatalog` with basic metadata from library page
- Set `storePageMissing: true`
- Populate only: `asin`, `title`, `authors`, `narrators`, `coverImageUrl`, `series` (if on library page)
- Leave other fields null

### Field Type Coercion

```javascript
// Duration: ISO 8601 → minutes
"PT12H34M" → 754 // (12 * 60 + 34)

// Rating: String → Number (1 decimal, no trailing .0)
"4.0 out of 5 stars" → 4
"4.5 out of 5 stars" → 4.5

// Progress: aria-valuenow attribute → percentage
aria-valuenow="65" → 65

// Cover URL: Full URL (no transformation)
"https://m.media-amazon.com/images/I/51Abc123._SL500_.jpg" → (keep as-is)

// Series position: Handle ranges
"Book 1" → "1"
"Books 1-3" → "1-3"
"Book 12, 13" → "12, 13"
```

### Null Handling

- **Omit null fields** from JSON output (don't include `"field": null`)
- Exception: `storePageMissing` - include as `false` if store page succeeded
- Empty arrays: Include as `[]` (don't omit)
- Empty strings: Omit (treat as null)

---

## Example: Complete JSON Output

```json
{
  "syncedAt": "2026-02-11T14:30:15.234Z",
  "userId": "user@example.com",
  "summary": {
    "totalTitles": 3,
    "libraryCount": 2,
    "wishlistCount": 1,
    "scrapeDurationMs": 45000,
    "warnings": [
      "Store page missing for ASIN: B001EXAMPLE"
    ]
  },
  "titleCatalog": [
    {
      "asin": "B001EXAMPLE",
      "title": "Example Audiobook",
      "authors": ["John Doe"],
      "narrators": ["Jane Smith"],
      "coverImageUrl": "https://m.media-amazon.com/images/I/51Example._SL500_.jpg",
      "storePageMissing": true
    },
    {
      "asin": "B002EXAMPLE",
      "title": "The Great Gatsby",
      "subtitle": "A Novel",
      "authors": ["F. Scott Fitzgerald"],
      "narrators": ["Jake Gyllenhaal"],
      "series": {
        "name": "Classic American Literature",
        "position": "1"
      },
      "duration": 287,
      "publisher": "Recorded Books",
      "releaseDate": "2013-06-15",
      "categories": ["Fiction", "Classics", "Literary Fiction"],
      "language": "en",
      "summary": "The story of the mysteriously wealthy Jay Gatsby and his love for Daisy Buchanan.",
      "coverImageUrl": "https://m.media-amazon.com/images/I/51Gatsby._SL500_.jpg",
      "rating": 4.5,
      "ratingCount": 12543,
      "plusCatalog": false,
      "whispersync": "available",
      "storePageMissing": false
    },
    {
      "asin": "B003WISHLIST",
      "title": "Wishlist Example",
      "authors": ["Author Name"],
      "narrators": ["Narrator Name"],
      "coverImageUrl": "https://m.media-amazon.com/images/I/51Wishlist._SL500_.jpg",
      "rating": 4.8,
      "ratingCount": 8421,
      "plusCatalog": true
    }
  ],
  "userLibrary": [
    {
      "asin": "B001EXAMPLE",
      "source": "LIBRARY",
      "personalRating": 4,
      "listeningProgress": 0
    },
    {
      "asin": "B002EXAMPLE",
      "source": "LIBRARY",
      "personalRating": 5,
      "listeningProgress": 65,
      "dateAdded": "2023-08-15T12:00:00.000Z"
    },
    {
      "asin": "B003WISHLIST",
      "source": "WISHLIST"
    }
  ]
}
```

---

## Schema Evolution Notes

### Current Version: 1.0

This is the initial schema version. Future changes will be documented here.

### Future Considerations (Not in MVP)

- `titleCatalog[].tags`: Array of topic tags (currently scraped but not included)
- `titleCatalog[].relatedBooks`: People Also Bought / More Like This (currently scraped by existing extension)
- `userLibrary[].collections`: User-created collections/playlists
- `userLibrary[].notes`: User notes on titles
- `userLibrary[].lastListened`: Timestamp of last playback

These fields are **deferred** to keep MVP simple. Schema can be extended without breaking existing consumers.

---

## Contract with Website Import API

When API upload is implemented (P3 story - FUTURE), the website's `/api/sync/import` endpoint will:

1. **Parse** this JSON format
2. **Upsert** titles into TitleCatalog table (keyed by ASIN)
3. **Full-replace** user's UserLibrary table (delete existing, insert from payload)
4. **Return** import summary: `{ success: true, titlesImported: 247, newToCatalog: 12 }`

The website schema matches this JSON structure, so no transformation layer is needed. This alignment is intentional (per Constitution Principle III: Data Normalization).

---

**Data Model Complete**: Ready for contract generation (JSON Schema).
