# Extension — Audible Library Sync

## Purpose

A Chrome/Edge browser extension that extracts a user's Audible library and wishlist data, focusing exclusively on user-specific metadata (personal ratings, listening progress). An external API provides detailed book metadata (authors, narrators, duration, etc.) using ASINs, eliminating the need for store page scraping.

## What It Does

1. **Detects a sync token** — When the user initiates a "Connect extractor" flow from the website, the extension picks up a short-lived token from the Audible tab URL.
2. **Presents a sync UI** — Displays a minimal overlay on the Audible page with a "Start Sync" action and progress indicators (no configuration needed).
3. **Scrapes library data** — Fetches the user's library and wishlist pages from Audible, extracting only user-specific data: ASIN, title, personal rating (0-5 stars), and listening status (Finished, Not Started, or time remaining).
4. **Normalizes to JSON** — Produces a simplified JSON payload containing only essential user-specific fields (asin, title, userRating, status, source).
5. **Uploads to the website** — POSTs the JSON payload to the platform's import endpoint using the sync token for authentication. The platform API then enriches each title with full metadata from an external book API using the ASIN.
6. **Reports status** — Shows success/failure state, item counts, and any warnings (e.g., wishlist unavailable) to the user.

## How It Scrapes (High Level)

Simplified approach focusing on user-specific data only:

- **Library pages** — Fetches paginated library list pages and parses title cards from the DOM for user-specific metadata (ASIN, title, personal rating from `data-star-count` attribute, listening status from time remaining elements).
- **No store pages** — Store page scraping has been removed. Detailed book metadata (authors, narrators, duration, summary, etc.) is fetched by the platform API from an external source using the ASIN.
- **Fast extraction** — Completes in <30 seconds for 100 titles (vs 10+ minutes with store scraping).
- **Local only** — All scraping happens within the user's authenticated browser session. No credentials are collected or transmitted.

## What It Does NOT Do

- Does not store Amazon/Audible credentials.
- Does not run in the background without user action (default behavior).
- Does not access any Audible account settings or make changes to the user's Audible account.
- Does not handle user authentication for the website — that's the website's responsibility.

## Key Interactions

| Action | Direction | Description |
|--------|-----------|-------------|
| Receive token | Website → Extension | Token passed via URL parameter on the Audible tab |
| Scrape data | Extension → Audible | Local fetches within the user's browser session |
| Upload JSON | Extension → Website | POST to import endpoint with token + payload |
| Show status | Extension → User | Overlay/popup with progress and results |

## Output Format

The extension produces a simplified JSON payload containing:

- An array of title objects with user-specific metadata only:
  - `asin`: Audible product ID
  - `title`: Book title (for error reporting)
  - `userRating`: Personal star rating (0-5)
  - `status`: Listening progress ("Finished", "Not Started", or time remaining like "15h 39m left")
  - `source`: Origin ("LIBRARY" or "WISHLIST")
- Summary metadata (library count, wishlist count, scrape duration, timestamp)

Detailed book metadata (authors, narrators, duration, cover art, summary, etc.) is fetched by the platform API using the ASIN.
