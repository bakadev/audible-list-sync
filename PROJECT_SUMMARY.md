# audioshlf

## What Is This?

audioshlf is a platform that lets Audible listeners share, organize, and showcase their audiobook collections. Users connect their Audible library through a browser extension, and the platform gives them tools to build curated lists and tier rankings from their personal collection.

## The Problem

Audible doesn't offer a way for listeners to share their libraries, compare collections, or create curated recommendation lists. Readers who want to share "my top 10 LitRPG narrators" or rank their collection into tiers have no dedicated tool for it.

## How It Works

1. **Create an account** on the website.
2. **Install the browser extension** and connect it to your account via a short-lived token.
3. **Sync your Audible library** — the extension scrapes your library and wishlist while you're logged into Audible, then uploads the data as JSON to the website.
4. **Browse, organize, and share** — use the website to build recommendation lists, tier lists, and share your collection publicly or with friends.

## Core Concepts

### Title Catalog vs. User Libraries

The platform maintains a shared catalog of audiobook titles. When a user syncs their library, any title not already in the catalog gets added. User libraries only store references to catalog entries along with personal metadata (listening progress, personal ratings, etc.). This avoids duplicating title data across thousands of users.

### User-Created Lists

Users can create two types of organized collections from their own library:

- **Recommendation Lists** — themed, ordered lists with optional descriptions (e.g., "Funniest LitRPG," "Books by Favorite Narrator," "Best Series for Road Trips").
- **Tier Lists** — rank titles into tiers (S, A, B, C, etc.) with drag-and-drop organization.

Users can only add titles that exist in their personal library to these lists, even if other titles exist in the platform catalog.

### Sharing

Users control the visibility of their profile and lists:

- Public — visible to anyone
- Unlisted — accessible via direct link
- Friends only — visible to approved connections

## Project Structure

```
packages/
  extension/    → Browser extension (Audible scraper + sync)
  ui/           → Website frontend and backend
  db/           → Database schema and configuration
```

## Security Principles

- The platform never asks for or stores Amazon/Audible credentials.
- All scraping happens locally in the user's browser session.
- Sync tokens are short-lived, single-use, and scoped to upload only.
- Users can revoke their extension connection at any time.

## Data Flow

```
Audible (in browser) → Extension scrapes locally → JSON payload
    → POST to website with token → Validate + store
    → Titles added to catalog if new
    → User library updated with title references + personal metadata
```
