# UI — Website Application

## Purpose

The core web application that serves as the platform's frontend and backend. This is where users manage their accounts, view their synced libraries, build curated lists and tier rankings, and share their collections with others.

## What It Does

### User Accounts and Authentication

- User registration and login.
- Profile management (display name, avatar, privacy settings).
- Session management and secure authentication.

### Extension Connection

- "Connect extractor" flow that generates a short-lived, single-use sync token tied to the user's account.
- Opens Audible in a new tab with the token embedded for the extension to pick up.
- Dashboard display of connection status, last sync timestamp, and sync history.

### Import Endpoint

- Receives JSON payloads from the extension via POST.
- Validates the sync token (expiry, single-use, user association).
- Validates payload shape and enforces size limits.
- Processes the payload:
  - Checks each title against the shared catalog by ID (ASIN). Adds new titles to the catalog if they don't exist.
  - Updates the user's library and wishlist with title references and personal metadata (listening progress, personal rating, date added, etc.).
- Returns a success response with a summary of what was imported.

### Library Browsing

- Users can browse their synced library and wishlist.
- Title details are populated from the shared catalog — the user's personal data (progress, ratings) is layered on top.
- Filtering and sorting by author, narrator, series, duration, rating, genre, etc.

### Recommendation Lists

- Users create themed, ordered lists from titles in their personal library.
- Each list has a title, optional description, and an ordered set of titles.
- Users can only add titles that exist in their own library.
- Examples: "Funniest LitRPG," "Best Series for Road Trips," "Books by Favorite Narrator."

### Tier Lists

- Users rank titles from their library into customizable tiers (S, A, B, C, D, F or user-defined).
- Drag-and-drop organization.
- Users can only add titles that exist in their own library.

### Sharing and Visibility

- Users control visibility of their profile, library, and individual lists:
  - **Public** — visible to anyone.
  - **Unlisted** — accessible only via direct link.
  - **Friends only** — visible to approved connections.
- Shareable URLs for profiles, libraries, recommendation lists, and tier lists.

### Sync Management

- Dashboard showing sync history with timestamps, item counts, and any warnings.
- "Update library" action to trigger a new sync (generates a fresh token and opens the connect flow).
- Ability to revoke the extension connection, invalidating future tokens.

## What It Does NOT Do

- Does not scrape Audible — that's the extension's job.
- Does not store or request Amazon/Audible credentials.
- Does not allow users to add titles to lists that aren't in their personal library.

## Key Pages / Views

| Page | Description |
|------|-------------|
| Landing / Home | Platform overview and sign-up prompt |
| Dashboard | User's library overview, sync status, quick actions |
| Library | Full browsable library with filtering and sorting |
| Wishlist | Synced wishlist view |
| List Builder | Create and edit recommendation lists |
| Tier List Builder | Create and edit tier rankings |
| Profile / Share Page | Public-facing view of a user's collection and lists |
| Settings | Account, privacy, and connection management |
