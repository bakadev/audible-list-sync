# Extension — Audible Library Sync

## Purpose

A Chrome/Edge browser extension that extracts a user's Audible library and wishlist data and uploads it to the Audible Library Share Platform. It acts as the bridge between Audible (where the data lives behind authentication) and our website (where the data gets stored and displayed).

## What It Does

1. **Detects a sync token** — When the user initiates a "Connect extractor" flow from the website, the extension picks up a short-lived token from the Audible tab URL.
2. **Presents a sync UI** — Displays a minimal overlay or popup on the Audible page with a "Start Sync" action and progress indicators.
3. **Scrapes library data** — Fetches the user's library and wishlist pages from Audible, extracting title metadata from DOM content and embedded JSON data on store pages.
4. **Normalizes to JSON** — Produces a structured JSON payload containing titles (with metadata like ASIN, title, authors, narrators, duration, cover art, summary, series info, ratings) and user-specific data (library vs. wishlist membership, listening progress, personal ratings).
5. **Uploads to the website** — POSTs the JSON payload to the platform's import endpoint using the sync token for authentication.
6. **Reports status** — Shows success/failure state, item counts, and any warnings (e.g., wishlist unavailable) to the user.

## How It Scrapes (High Level)

The extension is modeled after the audible-library-extractor approach but simplified:

- **Library pages** — Fetches paginated library list pages and parses title cards from the DOM for basic metadata and store page URLs.
- **Store pages** — Fetches individual title pages to extract richer metadata from embedded structured data (JSON blocks) and DOM elements as fallback.
- **Rate limiting** — Throttles requests to avoid overloading Audible's servers.
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

The extension produces a single JSON payload containing:

- An array of title objects with full metadata
- User-specific annotations (library vs. wishlist, progress, ratings)
- Sync metadata (timestamp, extension version, Audible region)
