# DB — Database

## Purpose

Houses the PostgreSQL database that serves as the platform's persistent data store. Runs in a Docker container for local development and portability.

## What It Stores

### Title Catalog

The shared catalog of audiobook titles. Each entry represents a unique Audible title identified by its ASIN. When any user syncs a title that doesn't yet exist in the catalog, it gets added here. All users' libraries reference these shared catalog entries rather than duplicating title data.

Catalog entries contain the full metadata scraped from Audible: title, subtitle, authors, narrators, series info, duration, publisher, release date, summary, cover art reference, categories, language, aggregate rating, and rating count.

### User Accounts

User authentication and profile data: credentials/auth info, display name, avatar, privacy settings, and account status.

### User Libraries

Each user's personal collection. Stores references to catalog title IDs along with user-specific metadata: library vs. wishlist membership, listening progress, personal rating, date added, and any other personal annotations. This is a lightweight join — the heavy title metadata lives in the catalog.

### User Lists

Recommendation lists and tier lists created by users. Each list has ownership, visibility settings, a title, optional description, and an ordered collection of title references. Tier lists additionally store tier assignments (S, A, B, C, etc.) for each title.

### Sync Tokens and History

Short-lived tokens generated for the extension connect flow, along with a log of sync events (timestamp, items imported, warnings, success/failure status).

## Technology

- **PostgreSQL** — primary relational database
- **Docker** — containerized for local development and consistent environments
- Configuration, schema definitions, and migrations will live in this directory.

## Key Relationships

```
Users ──< User Libraries >── Title Catalog
Users ──< User Lists >── Title Catalog (via User Libraries)
Users ──< Sync History
Users ──< Sync Tokens
```

A user's lists can only reference titles that exist in that user's library, which in turn references the shared title catalog.
