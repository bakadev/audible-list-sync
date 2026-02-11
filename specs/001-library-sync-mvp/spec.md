# Feature Specification: Audible Library Sync MVP

**Feature Branch**: `001-library-sync-mvp`
**Created**: 2026-02-11
**Status**: Draft
**Input**: User description: "Audible Library Sync MVP - sync library via browser extension and browse on website"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Account via Google OAuth (Priority: P1)

A heavy Audible listener discovers the platform and wants to create an account. They click "Sign up with Google," authorize the app through Google's consent screen, and land on their empty dashboard with instructions to connect the extension.

**Why this priority**: Foundation for all other features. Without authentication, no user data can be stored or associated. This is the entry point to the platform.

**Independent Test**: Can be fully tested by completing Google OAuth flow and verifying a user record exists with Google-provided profile data (email, name). Delivers a working authentication system.

**Acceptance Scenarios**:

1. **Given** no existing account, **When** user clicks "Sign up with Google" and completes OAuth consent, **Then** user is redirected to dashboard with their Google profile name displayed
2. **Given** an existing account, **When** user clicks "Sign in with Google" and completes OAuth, **Then** user is logged in and sees their dashboard
3. **Given** user denies Google OAuth consent, **When** OAuth flow is cancelled, **Then** user sees an error message and remains on the landing page
4. **Given** user is logged in, **When** user clicks "Log out", **Then** session is terminated and user returns to landing page

---

### User Story 2 - Connect Extension to Account (Priority: P2)

A logged-in user wants to connect the Chrome extension to their account. From their dashboard, they click "Connect extension," which generates a short-lived token and opens audible.com in a new tab with the token in the URL. The extension detects the token and displays a confirmation message that it's connected to their account.

**Why this priority**: Bridges the gap between the website and extension. Without this connection mechanism, the extension cannot upload data to the user's account. Must happen before any sync can occur.

**Independent Test**: Can be tested by generating a token, opening the special URL with the extension installed, and verifying the extension displays the connected state. Delivers the connection handshake without requiring a full sync.

**Acceptance Scenarios**:

1. **Given** user is logged in without extension connected, **When** user clicks "Connect extension" on dashboard, **Then** system generates a token, opens audible.com with token in URL, and shows "Waiting for extension" status
2. **Given** extension is installed and user opens audible.com with a valid token in URL, **When** page loads, **Then** extension detects token, stores it, and displays "Connected to [user name]" confirmation
3. **Given** extension has a stored token, **When** user navigates away and returns to audible.com, **Then** extension still shows connected state
4. **Given** token is older than 1 hour, **When** extension tries to use it, **Then** extension displays "Token expired, please reconnect" message

---

### User Story 3 - Sync Library via Extension (Priority: P3)

A user with extension connected wants to sync their Audible library for the first time. They click "Start Sync" in the extension overlay on audible.com. The extension shows a progress indicator as it scrapes their library and wishlist pages, then uploads the data to the website. When complete, the extension displays "Synced 245 titles" and closes.

**Why this priority**: Core value proposition. This is where the user's Audible data actually enters the platform. Without this, there's nothing to browse or organize.

**Independent Test**: Can be tested by clicking "Start Sync" with a test Audible account and verifying the JSON payload reaches the import endpoint with correct structure. Delivers the scraping and upload pipeline.

**Acceptance Scenarios**:

1. **Given** extension is connected and user is on audible.com library page, **When** user clicks "Start Sync", **Then** extension scrapes library and wishlist, uploads JSON, and shows success with item counts
2. **Given** extension is scraping, **When** user navigates away from Audible, **Then** sync pauses and shows "Please stay on Audible during sync" warning
3. **Given** sync is in progress, **When** scraping encounters a network error, **Then** extension retries with exponential backoff up to 3 times before showing error
4. **Given** sync upload fails, **When** server returns validation error, **Then** extension displays the specific error message from server response
5. **Given** user has no wishlist, **When** sync runs, **Then** extension skips wishlist scraping and shows "Library synced, wishlist unavailable" message

---

### User Story 4 - Browse Synced Library (Priority: P4)

A user who has completed their first sync wants to see their audiobooks on the website. They navigate to the "My Library" page and see a list of all synced titles with cover art, title, author, narrator, and duration. They use the search bar to find titles by name or author.

**Why this priority**: Immediate payoff after sync. Users need to verify their data was imported correctly and explore what they have. This validates the sync worked and provides basic utility.

**Independent Test**: Can be tested by manually seeding a user's library with test data and verifying the library page displays it correctly with working search. Delivers a functional library viewer.

**Acceptance Scenarios**:

1. **Given** user has synced titles, **When** user opens "My Library" page, **Then** all titles display with cover, title, author, narrator, duration, and listening progress
2. **Given** user is on library page with 200 titles, **When** user types in search bar, **Then** results filter in real-time to show matching titles by name, author, or narrator
3. **Given** user has both library and wishlist items, **When** user views library page, **Then** titles show a badge indicating "Library" or "Wishlist"
4. **Given** user has no synced data, **When** user opens library page, **Then** page shows "No titles yet. Connect your extension to get started" with link to dashboard

---

### User Story 5 - Re-sync Library (Priority: P5)

A user who synced weeks ago has bought new audiobooks and wants to update their library. From their dashboard, they click "Update library" which generates a fresh token and opens the extension connection flow. After reconnecting and syncing, the dashboard shows the new timestamp and updated item counts.

**Why this priority**: Keeps data fresh as users add new audiobooks. Without this, library becomes stale and loses utility. Lower priority than initial sync because it uses the same flow.

**Independent Test**: Can be tested by syncing once, manually adding titles to test Audible account, then re-syncing and verifying new titles appear in library. Delivers incremental sync capability.

**Acceptance Scenarios**:

1. **Given** user has previously synced, **When** user clicks "Update library" on dashboard, **Then** new token is generated and connection flow starts
2. **Given** user completes re-sync with new titles, **When** sync finishes, **Then** dashboard shows new "Last synced" timestamp and updated item count (e.g., "245 → 257 titles")
3. **Given** user re-syncs with no changes, **When** sync completes, **Then** dashboard shows "No changes detected" message
4. **Given** user removed titles from Audible library, **When** user re-syncs, **Then** removed titles are marked as removed in platform (but not deleted - preserves list references)

---

### Edge Cases

- What happens when user has 1000+ titles and sync takes 10+ minutes?
  - Extension must show continuous progress (e.g., "Syncing 234/1043...") and handle browser tab being backgrounded without timing out

- How does system handle duplicate syncs?
  - If user clicks sync while another sync is running, show "Sync already in progress" error
  - If user generates new token while one exists, old token is invalidated

- What if user's Audible session expires during scraping?
  - Extension detects 401/403 responses and shows "Please log back into Audible" error

- How does system handle titles with missing metadata?
  - Extension sends whatever fields are available; website fills with "Unknown" for display

- What if extension fails to reach import endpoint (network down)?
  - Extension shows "Upload failed - check connection" and offers "Retry" button. Scraped data is held in memory for retry.

- What happens when user revokes Google OAuth access?
  - Next login attempt fails; user must re-authorize. Existing session remains valid until expiration.

- What if title has special characters or extremely long title/author names?
  - Website validates length limits (title ≤ 500 chars, author/narrator ≤ 200 chars each) and truncates with "..." if needed

## Requirements *(mandatory)*

### Functional Requirements

**Authentication**
- **FR-001**: System MUST authenticate users exclusively via Google OAuth (no email/password option in MVP)
- **FR-002**: System MUST create user record on first successful OAuth, storing Google user ID, email, display name, and avatar URL
- **FR-003**: System MUST maintain secure session after OAuth, lasting 30 days or until user logs out
- **FR-004**: Users MUST be able to log out, which terminates their session immediately

**Extension Connection**
- **FR-005**: System MUST generate short-lived (1 hour max), single-use sync tokens tied to user account
- **FR-006**: System MUST provide a "Connect extension" action that generates token and opens audible.com with token in URL fragment
- **FR-007**: Extension MUST detect token in URL, validate it's not expired, and store it for sync use
- **FR-008**: Extension MUST display connected user's name after successful token detection
- **FR-009**: System MUST invalidate token after first use or after 1 hour, whichever comes first

**Library Scraping**
- **FR-010**: Extension MUST scrape library and wishlist data from audible.com US region only
- **FR-011**: Extension MUST require explicit user action (button click) to start scraping, never run automatically
- **FR-012**: Extension MUST display real-time progress during scraping (current item, total items, current operation)
- **FR-013**: Extension MUST extract: ASIN, title, subtitle, authors, narrators, series info, duration, cover art URL, summary, ratings, listening progress, date added
- **FR-014**: Extension MUST throttle requests to Audible (max 5 concurrent, 500ms delay between batches) to avoid rate limiting
- **FR-015**: Extension MUST handle scraping errors with exponential backoff (retry up to 3 times with 1s, 2s, 4s delays)

**Data Import**
- **FR-016**: System MUST accept JSON payload via POST to import endpoint, authenticated with sync token
- **FR-017**: System MUST validate token before processing payload (not expired, not used, belongs to user)
- **FR-018**: System MUST validate payload structure (required fields present, types correct, size under 50MB)
- **FR-019**: System MUST add new titles to shared catalog keyed by ASIN, or update existing if metadata changed
- **FR-020**: System MUST update user's library with references to catalog titles plus personal metadata (progress, rating, date added, library vs. wishlist)
- **FR-021**: System MUST record sync event with timestamp, item counts (new, updated, removed), and any warnings
- **FR-022**: System MUST return success response with summary: titles added, updated, and any skipped items with reasons

**Library Browsing**
- **FR-023**: Users MUST be able to view their synced library on a dedicated "My Library" page
- **FR-024**: Library page MUST display titles with: cover art, title, author(s), narrator(s), duration, listening progress bar, library/wishlist badge
- **FR-025**: Library page MUST provide search bar that filters results by title, author, or narrator in real-time
- **FR-026**: Library page MUST display "No titles yet" empty state with link to connect extension when user has no synced data
- **FR-027**: User library MUST always be private, no public URL or sharing option in MVP

**Dashboard**
- **FR-028**: System MUST provide dashboard showing: last sync timestamp, total title count, library vs. wishlist breakdown, and sync history (last 5 events)
- **FR-029**: Dashboard MUST show "Connect extension" button if no sync has occurred, or "Update library" button if synced previously
- **FR-030**: Dashboard MUST display sync warnings if any occurred (e.g., "3 titles missing cover art")

### Key Entities

- **User**: Represents a platform account. Attributes: Google user ID (unique), email, display name, avatar URL, account creation date, last login timestamp.

- **Sync Token**: Short-lived credential for extension to upload data. Attributes: token string, user reference, creation timestamp, expiration timestamp (1 hour), used flag (single-use).

- **Title (Catalog)**: Shared audiobook metadata. Attributes: ASIN (unique identifier), title, subtitle, authors (array), narrators (array), series name and position, duration, cover art URL, summary text, aggregate rating, rating count, publisher, release date, language, categories. Shared across all users.

- **User Library Entry**: User's personal relationship to a catalog title. Attributes: reference to user, reference to catalog title, source type (library or wishlist), listening progress percentage, personal rating (1-5 stars), date added to user's library, last updated timestamp.

- **Sync Event**: Record of a sync operation. Attributes: reference to user, timestamp, item counts (titles synced, new, updated, removed), warnings (array of messages), success/failure status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete account creation via Google OAuth in under 30 seconds from landing page to dashboard
- **SC-002**: Users can connect extension and complete first-time sync of 200 titles in under 5 minutes
- **SC-003**: Library search returns filtered results in under 500ms for libraries with up to 500 titles
- **SC-004**: 90% of syncs complete successfully without user intervention or errors
- **SC-005**: Users can find and view any synced title in their library within 15 seconds using search
- **SC-006**: System supports syncing libraries with up to 1000 titles without timeout or data loss
- **SC-007**: Dashboard accurately reflects sync status within 5 seconds of sync completion
- **SC-008**: Extension provides clear progress indication updating at least once per second during sync
- **SC-009**: Re-sync operations complete in under 3 minutes for users with 200 titles and 20 new additions

## Assumptions

- Users have active Audible.com accounts (US region) and are comfortable using browser extensions
- Users own 100+ audiobooks and are motivated to organize/share their collections
- Google OAuth is acceptable as the sole authentication method for MVP (email/password deferred)
- Chrome browser is sufficient for MVP (other Chromium browsers may work but not officially supported)
- Users will manually initiate syncs rather than expecting automatic background updates
- Audible's website structure remains stable enough for DOM scraping (no API access)
- Average Audible library size is 200-300 titles; edge case of 1000+ titles is rare but must be supported
- Network connection is stable during sync operations (mobile/spotty connections may fail)

## Out of Scope (Post-MVP)

**Explicitly deferred to future phases**:
- Recommendation lists and tier lists (data model should accommodate but no UI/features yet)
- Sharing features (public URLs, visibility controls) - all libraries private in MVP
- Social features (profiles, following, likes, comments) - platform is single-player in MVP
- Additional OAuth providers (Facebook, Twitter, email/password)
- Multi-region Audible support (UK, Canada, Australia, etc.) - US only for MVP
- Advanced filtering/sorting in library view (genre, series, length, rating) - basic search only
- Bulk actions (select multiple titles, batch operations)
- Extension for browsers other than Chrome (Firefox, Safari, Edge)
- Mobile app or responsive mobile web (desktop-first for MVP)
- Analytics and usage tracking beyond basic sync history
- User settings (timezone, display preferences, privacy controls)

## Constitutional Alignment

This feature aligns with the project's core principles:

- **Security & Privacy First**: Extension never collects credentials; scraping is local; tokens are short-lived and single-use; libraries are private by default
- **Package-Based Architecture**: Feature spans all three packages (extension, ui, db) with clear interfaces (JSON payload, HTTP API, database schema)
- **Data Normalization**: Title catalog is shared; user libraries store references only
- **Responsible External Integration**: Extension implements rate limiting and exponential backoff when scraping Audible
- **User Control & Transparency**: Sync requires explicit user action; progress is visible; dashboard shows sync status and history
