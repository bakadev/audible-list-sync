# Data Model: Extension Simplification

**Feature**: Extension Simplification
**Branch**: `003-simplify-extension`
**Date**: 2026-02-11

## Overview

This document defines the simplified data model for the Audible library extension. The extension now focuses exclusively on user-specific metadata (rating, listening status) and ASINs for API lookup. All detailed book metadata (authors, narrators, duration, etc.) is handled by external API.

## Entities

### UserLibraryTitle

Represents a single audiobook in the user's Audible library or wishlist with user-specific metadata.

**Purpose**: Capture user-specific data that cannot be obtained from external API.

**Source**: DOM extraction from Audible library/wishlist pages.

#### Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `asin` | string | Yes | Audible Standard Identification Number (product ID) | Non-empty, alphanumeric, typically 10 characters (e.g., "B09GHRGYRF") |
| `title` | string | Yes | Book title (for error reporting and user visibility) | Non-empty string, max 500 characters |
| `userRating` | number | Yes | Personal star rating (0-5) | Integer 0-5 inclusive, default 0 if unrated |
| `status` | string | Yes | Listening progress status | Enum: "Finished", "Not Started", or "In Progress" |
| `progress` | number | Yes | Listening progress percentage | Integer 0-100 inclusive (0 for Not Started, 100 for Finished, percentage for In Progress) |
| `timeLeft` | string | No | Remaining listening time (In Progress only) | Pattern: /^\d+[dhms]( \d+[dhms])*\s+left$/ (e.g., "15h 39m left", "39m left") |
| `source` | string | Yes | Origin of the title | Enum: "LIBRARY" or "WISHLIST" |

#### Field Extraction Details

**asin**:
- DOM: `data-asin` attribute on library row element (e.g., `<li class="productListItem" data-asin="B09GHRGYRF">`)
- Fallback: Parse from element IDs (e.g., `time-remaining-finished-B09GHRGYRF`)
- Validation: Must be non-empty alphanumeric string

**title**:
- DOM: `.bc-heading` or `.bc-size-headline3` text content within library row
- Purpose: Human-readable identifier for error messages and JSON readability
- Validation: Non-empty string, trim whitespace

**userRating**:
- DOM: `data-star-count` attribute on `.adbl-prod-rate-review-bar` element
- Example: `<div class="adbl-prod-rate-review-bar" data-star-count="4">` → `userRating: 4`
- Default: `0` if element missing or attribute empty
- Validation: Integer 0-5 inclusive

**status**:
- DOM: Multiple patterns (priority order):
  1. Finished: `<span id="time-remaining-finished-{ASIN}">Finished</span>` (not hidden with `bc-pub-hidden`) → `"Finished"`
  2. In Progress: `<span class="bc-text bc-color-secondary">15h 39m left</span>` (inside `#time-remaining-display-{ASIN}`) → `"In Progress"`
  3. Not Started: Element missing → `"Not Started"` (default)
- Example Values: `"Finished"`, `"In Progress"`, `"Not Started"`
- Validation: Enum ["Finished", "Not Started", "In Progress"]

**progress**:
- DOM: `aria-valuenow` attribute on progress bar element (`[role="progressbar"]`)
- Example: `<div role="progressbar" aria-valuenow="63">` → `progress: 63`
- Default values by status:
  - Not Started: `0`
  - In Progress: percentage from `aria-valuenow` (0-100)
  - Finished: `100`
- Validation: Integer 0-100 inclusive

**timeLeft**:
- DOM: `<span class="bc-text bc-color-secondary">15h 39m left</span>` (inside `#time-remaining-display-{ASIN}`)
- Example Values:
  - `"15h 39m left"`
  - `"2h 15m left"`
  - `"39m left"`
  - `"30s left"`
- Only present for `status: "In Progress"`
- Validation: Pattern /^\d+[dhms]( \d+[dhms])*\s+left$/ (days, hours, minutes, or seconds)

**source**:
- Value: `"LIBRARY"` for titles from library pages, `"WISHLIST"` for titles from wishlist pages
- Purpose: Distinguish ownership vs intent-to-purchase
- Validation: Enum ["LIBRARY", "WISHLIST"]

#### Example Instances

**Finished Library Book**:
```json
{
  "asin": "B09GHRGYRF",
  "title": "Project Hail Mary",
  "userRating": 5,
  "status": "Finished",
  "progress": 100,
  "source": "LIBRARY"
}
```

**In-Progress Library Book**:
```json
{
  "asin": "B0FXBHJXPD",
  "title": "The Anthropocene Reviewed",
  "userRating": 4,
  "status": "In Progress",
  "progress": 63,
  "timeLeft": "15h 39m left",
  "source": "LIBRARY"
}
```

**Not-Started Wishlist Book**:
```json
{
  "asin": "B0FZWMD83N",
  "title": "Wishlist Item Example",
  "userRating": 0,
  "status": "Not Started",
  "progress": 0,
  "source": "WISHLIST"
}
```

**Unrated Library Book**:
```json
{
  "asin": "B01234ABCD",
  "title": "Some Book I Own",
  "userRating": 0,
  "status": "Not Started",
  "progress": 0,
  "source": "LIBRARY"
}
```

---

## Aggregates

### ExtensionOutput

Complete JSON payload exported by the extension, containing all user library titles and summary metadata.

#### Structure

```json
{
  "titleCatalog": [UserLibraryTitle],
  "summary": {
    "libraryCount": number,
    "wishlistCount": number,
    "scrapeDurationMs": number,
    "scrapedAt": string (ISO 8601)
  }
}
```

#### Fields

**titleCatalog**:
- Type: Array of `UserLibraryTitle` objects
- Purpose: All scraped titles from library and wishlist
- Validation: Non-empty array, no duplicate ASINs within same source

**summary.libraryCount**:
- Type: number
- Purpose: Count of titles with `source: "LIBRARY"`
- Validation: Non-negative integer, matches filter count

**summary.wishlistCount**:
- Type: number
- Purpose: Count of titles with `source: "WISHLIST"`
- Validation: Non-negative integer, matches filter count

**summary.scrapeDurationMs**:
- Type: number
- Purpose: Total scraping time in milliseconds
- Validation: Positive integer

**summary.scrapedAt**:
- Type: string (ISO 8601 datetime)
- Purpose: Timestamp of scraping completion
- Validation: Valid ISO 8601 format (e.g., "2026-02-11T15:30:00Z")

#### Example Output

```json
{
  "titleCatalog": [
    {
      "asin": "B09GHRGYRF",
      "title": "Project Hail Mary",
      "userRating": 5,
      "status": "Finished",
      "progress": 100,
      "source": "LIBRARY"
    },
    {
      "asin": "B0FXBHJXPD",
      "title": "The Anthropocene Reviewed",
      "userRating": 4,
      "status": "In Progress",
      "progress": 63,
      "timeLeft": "15h 39m left",
      "source": "LIBRARY"
    },
    {
      "asin": "B0FZWMD83N",
      "title": "Wishlist Item Example",
      "userRating": 0,
      "status": "Not Started",
      "progress": 0,
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

---

## Relationships

### UserLibraryTitle → External API

Each `UserLibraryTitle` contains an `asin` field that serves as a foreign key to external API book metadata.

**Flow**:
1. Extension scrapes user-specific data → `UserLibraryTitle` instances
2. Platform receives JSON payload via API upload
3. Platform uses `asin` to fetch book metadata from external API (authors, narrators, duration, cover art, summary, etc.)
4. Platform merges user-specific data with API book metadata in database

**Rationale**: Separation of concerns - extension captures user-specific data, API provides canonical book metadata.

---

## State Transitions

### Listening Status State Machine

```
[Not Started] --user starts listening--> [In Progress]
[In Progress] --user continues listening--> [In Progress] (time decreases)
[In Progress] --user finishes book--> [Finished]
[Finished] --permanent state--> [Finished]
```

**Notes**:
- Extension captures current state, does not track transitions
- State is read-only from user's Audible library page
- No reverse transitions (Finished → In Progress requires Audible action)

---

## Validation Rules

### Cross-Field Validation

1. **ASIN Uniqueness**: No duplicate ASINs within same `source` (LIBRARY or WISHLIST)
   - Multiple entries with same ASIN across different sources are allowed (e.g., in both library and wishlist)

2. **Title Presence**: If extraction fails, title defaults to `"Unknown Title - {ASIN}"` rather than empty string

3. **Status Consistency**:
   - Wishlist items typically have `status: "Not Started"` (not yet purchased)
   - Library items can have any status (Not Started, In Progress, Finished)

### Field-Specific Constraints

**userRating**:
- Minimum: 0 (unrated or explicitly 0 stars)
- Maximum: 5 (highest rating)
- No decimals (integer only)

**status**:
- Must be one of: "Finished", "Not Started", "In Progress"
- Invalid values default to "Not Started" with warning logged

**progress**:
- Must be integer 0-100 inclusive
- Must be consistent with status: 0 for Not Started, 100 for Finished, 1-99 for In Progress

**timeLeft**:
- Must match pattern /^\d+[dhms]( \d+[dhms])*\s+left$/
- Only valid when status is "In Progress"
- Must not be present for "Finished" or "Not Started" statuses

**asin**:
- Must be alphanumeric (no special characters except hyphens in some formats)
- Typically 10 characters but can vary
- Empty ASIN causes extraction to skip that title with error logged

---

## Comparison with Previous Model

### Removed Fields (Now via API)

The following fields were removed from `UserLibraryTitle` and are now fetched from external API:

| Field | Type | Reason for Removal |
|-------|------|-------------------|
| `authors` | array | Book metadata, not user-specific |
| `narrators` | array | Book metadata, not user-specific |
| `duration` | number | Book metadata, not user-specific |
| `coverImageUrl` | string | Book metadata, not user-specific |
| `series` | object | Book metadata, not user-specific |
| `publisher` | string | Book metadata, not user-specific |
| `releaseDate` | string | Book metadata, not user-specific |
| `categories` | array | Book metadata, not user-specific |
| `summary` | string | Book metadata, not user-specific |
| `aggregateRating` | number | Audible's rating, not user's personal rating |
| `reviewCount` | number | Book metadata, not user-specific |
| `subtitle` | string | Book metadata, not user-specific |

**Impact**: 80% reduction in JSON payload size, 95% reduction in scraping time.

### Retained Fields

| Field | Reason for Retention |
|-------|---------------------|
| `asin` | Required for API lookup |
| `title` | User visibility and error reporting |
| `userRating` | User-specific, not available via API |
| `status` | User-specific listening progress, not available via API |
| `source` | User-specific context (LIBRARY vs WISHLIST) |

---

## Implementation Notes

### DOM Extraction Strategy

1. **Primary Extraction**: Direct attribute/text extraction from DOM elements
2. **Fallback Strategy**: Default values for missing elements (rating → 0, status → "Not Started")
3. **Error Handling**: Log warnings for malformed data, skip titles with missing ASIN

### Performance Considerations

- **Memory**: Each `UserLibraryTitle` instance is ~150 bytes (vs ~2KB in previous model)
- **Network**: No store page fetches → 95% reduction in HTTP requests
- **Processing**: Simpler extraction logic → faster DOM parsing

### Backward Compatibility

**Breaking Change**: JSON schema is incompatible with previous extension output.

**Migration Strategy**:
- New schema version identifier in output (implicit via structure)
- Platform API can detect old vs new schema by presence of `authors` field
- Old extension output remains valid for existing users
- New extension output is preferred for new scrapes

---

## JSON Schema Reference

For formal validation, see [contracts/extension-output.schema.json](./contracts/extension-output.schema.json).
