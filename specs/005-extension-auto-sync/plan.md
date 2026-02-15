# Implementation Plan: Extension Auto-Sync with Manual Upload Fallback

**Branch**: `005-extension-auto-sync` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-extension-auto-sync/spec.md`

## Summary

Enable seamless library synchronization by adding automatic sync capability to the browser extension when a sync token is present in the URL. When no token is available, provide fallback UI with options to download JSON or return to the application. Additionally, add manual JSON upload interface to the web application's library page as an alternative sync method.

**Technical Approach**:
- Extend existing extension scraper to detect sync tokens from URL query parameters
- Implement auto-POST to existing `/api/sync/import` endpoint with token in Authorization header
- Add conditional UI in extension: success message for auto-sync, fallback options when no token
- Create new client-side upload component in Next.js web application
- Add new API route to handle manual file uploads using same sync logic

## Technical Context

**Language/Version**: TypeScript 5.9+ (extension & Next.js web app)
**Primary Dependencies**:
- Extension: Chrome Extensions Manifest V3 APIs, existing scraper logic
- Web App: Next.js 16, React 19, Prisma 6.19, NextAuth.js
**Storage**: PostgreSQL (existing database, no schema changes needed)
**Testing**: Not requested in spec (defer to manual/exploratory testing)
**Target Platform**:
- Extension: Chromium browsers (Chrome, Edge, Brave)
- Web App: Modern browsers, server-side rendering
**Project Type**: Monorepo with multiple packages (extension + web UI)
**Performance Goals**:
- Extension auto-sync: complete POST within 5 seconds for typical libraries
- Manual upload: process 500 titles within 30 seconds
**Constraints**:
- No changes to existing sync token generation or validation logic
- No changes to library scraping logic in extension
- Reuse existing `/api/sync/import` endpoint logic
**Scale/Scope**: Single-user sync operations, file sizes up to 5MB (estimated ~1000 titles)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Security & Privacy First (NON-NEGOTIABLE)

**Compliance**: PASS
- Extension continues to scrape only within user's authenticated browser session
- Sync tokens remain short-lived, single-use, and upload-only scoped
- No new credential storage or transmission
- Manual upload requires existing user authentication (NextAuth session)
- All data operations occur through existing secure channels

### ✅ II. Package-Based Architecture

**Compliance**: PASS
- Changes confined to two existing packages: `extension` and `ui`
- No new packages required
- Interface contract remains well-defined (HTTP POST to `/api/sync/import` with JSON payload)
- No circular dependencies introduced

### ✅ III. Data Normalization & Efficiency

**Compliance**: PASS
- No database schema changes
- Reuses existing sync import logic that populates normalized Title catalog
- Both auto-sync and manual upload use same endpoint, maintaining single source of truth
- No duplication of title metadata

### ✅ IV. Responsible External System Integration

**Compliance**: PASS
- No new external system integrations
- Extension scraping throttling unchanged
- Manual upload adds no new Audible requests
- Both flows reuse existing Audnex API integration from sync import endpoint

### ✅ V. User Control & Transparency

**Compliance**: PASS
- Extension provides clear status messages (success, no token, errors)
- Manual upload shows validation and processing feedback
- No changes to existing visibility or data control settings
- Users retain full control over sync timing (manual trigger via button or file upload)

**Post-Phase 1 Review**: Will re-check after contracts and data models are finalized.

## Project Structure

### Documentation (this feature)

```text
specs/005-extension-auto-sync/
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal - tech stack already known)
├── data-model.md        # Phase 1 output (existing entities, no schema changes)
├── quickstart.md        # Phase 1 output (test scenarios for both sync methods)
├── contracts/           # Phase 1 output (extension→API + upload API contracts)
│   ├── extension-auto-sync.md
│   └── manual-upload.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks command)
```

### Source Code (repository root)

```text
packages/
├── extension/
│   └── src/
│       ├── content.ts           # MODIFY: Add token detection & auto-POST logic
│       ├── ui/
│       │   └── popup.ts         # MODIFY: Add fallback UI (no token message)
│       └── lib/
│           └── sync.ts          # NEW: Extract sync logic (token detection, API POST)
│
└── ui/
    └── src/
        ├── app/
        │   ├── (authenticated)/
        │   │   └── library/
        │   │       └── page.tsx         # MODIFY: Add manual upload UI component
        │   └── api/
        │       └── library/
        │           └── upload/
        │               └── route.ts     # NEW: Manual upload endpoint
        │
        └── components/
            └── library/
                └── manual-upload.tsx    # NEW: File upload component
```

**Structure Decision**:
- **Extension package**: Existing content script modified to detect token and auto-POST. New `sync.ts` module extracts reusable sync logic. Popup UI updated for fallback messaging.
- **UI package**: New upload API route at `/api/library/upload` handles file uploads. New React component `manual-upload.tsx` provides file picker and progress UI. Library page integrates the upload component.

## Complexity Tracking

> No constitutional violations - this section intentionally left empty.

All changes align with existing architectural principles. Feature extends existing functionality without introducing new complexity or violating simplicity guidelines.

---

## Phase 0: Research & Discovery

### Research Questions

Since the technology stack is established and the sync endpoint already exists, minimal research is needed:

1. **Chrome Extension URL Parameter Access**: Confirm best practice for reading query parameters in content scripts (use `window.location.search` or `URLSearchParams`)

2. **File Upload in Next.js**: Identify recommended approach for handling file uploads in Next.js App Router (use `FormData` with native `fetch` or library like `react-dropzone`)

3. **Client-Side File Reading**: Confirm browser API for reading JSON files before upload (`FileReader` API)

4. **Progress Indication**: Determine UX pattern for upload progress (optimistic UI update vs. polling vs. WebSocket - choose simplest: optimistic update with loading state)

### Research Output

Document findings in `research.md`:
- Decision: Use `URLSearchParams` for token extraction (standard Web API, widely supported)
- Decision: Use `FileReader` API + `fetch` for manual upload (no external dependencies)
- Decision: Use optimistic UI updates with loading spinner (simplest approach)
- Decision: Reuse existing `/api/sync/import` validation logic for uploaded JSON

---

## Phase 1: Design & Contracts

### Data Model

**Output**: `data-model.md`

No new entities or schema changes required. Document existing entities used:

- **SyncToken**: Already exists (jti, userId, used, expiresAt)
- **LibraryEntry**: Already exists (userId, titleAsin, progress, userRating, source, status)
- **Title**: Already exists (asin, title, authors, narrators, image, etc.)

Note: Manual upload will use the same import flow as extension sync, creating/updating LibraryEntry records through existing logic.

### API Contracts

**Output**: `contracts/` directory

#### Contract 1: Extension Auto-Sync (`extension-auto-sync.md`)

**Endpoint**: `POST /api/sync/import` (existing)
**Trigger**: Extension content script detects token in URL, auto-POSTs after scrape complete

**Request**:
```typescript
Headers: {
  Authorization: "Bearer <sync_token>"
}
Body: {
  titles: ImportTitle[]  // Existing interface
}
```

**Response**:
```typescript
{
  success: boolean
  imported: number
  newToCatalog: number
  libraryCount: number
  wishlistCount: number
  warnings: string[]
}
```

**New Behavior**: Extension automatically invokes this endpoint when token detected, displays result to user.

#### Contract 2: Manual Upload (`manual-upload.md`)

**Endpoint**: `POST /api/library/upload` (new)
**Trigger**: User selects JSON file and clicks upload button on library page

**Request**:
```typescript
Content-Type: multipart/form-data
Body: FormData with "file" field containing JSON file
```

**Response**:
```typescript
{
  success: boolean
  imported: number
  newToCatalog: number
  libraryCount: number
  wishlistCount: number
  warnings: string[]
}
```

**Implementation**: Read file, parse JSON, validate structure, call same sync logic as `/api/sync/import`.

### Integration Scenarios

**Output**: `quickstart.md`

Document three test scenarios:

1. **Happy Path Auto-Sync**: User clicks "Update Library" → redirected to Audible with token → extension auto-syncs → user sees success message

2. **No Token Fallback**: User navigates to Audible directly → runs extension → sees "No token found" message → downloads JSON or returns to app

3. **Manual Upload**: User has JSON file → navigates to library page → uploads file → sees progress indicator → library updates with new titles

Each scenario includes:
- Prerequisites (user state, browser state, data state)
- Step-by-step actions
- Expected outcomes
- Validation checkpoints

### Agent Context Update

Run `.specify/scripts/bash/update-agent-context.sh claude` to update agent memory with:
- Extension auto-sync implementation pattern
- Manual upload component structure
- File upload API route pattern

---

## Phase 2: Task Generation

*Deferred to `/speckit.tasks` command*

Tasks will be organized by user story (P1: auto-sync, P2: fallback UI, P3: manual upload) to enable independent implementation and testing.

---

## Implementation Notes

### Extension Changes

**Token Detection Logic** (`lib/sync.ts`):
```typescript
function detectSyncToken(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('syncToken')
}
```

**Auto-POST Logic**:
```typescript
async function autoSync(token: string, libraryData: any) {
  const response = await fetch('https://myaudiblelists.com/api/sync/import', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ titles: libraryData })
  })
  return response.json()
}
```

**Fallback UI** (no token): Display message with two buttons:
- "Download JSON" → triggers download of scraped data
- "Return to App" → navigates to `https://myaudiblelists.com/library`

### Web Application Changes

**Manual Upload Component**:
- File input accepting `.json` files
- Validation: file size < 5MB, valid JSON structure
- Upload progress indicator
- Success/error message display

**Upload API Route** (`/api/library/upload/route.ts`):
1. Verify user authentication (NextAuth session)
2. Parse multipart form data to extract file
3. Read file contents and parse JSON
4. Validate JSON structure matches `ImportTitle[]` interface
5. Call existing sync import logic (same as `/api/sync/import` internal logic)
6. Return success response with import stats

### Security Considerations

- Manual upload endpoint requires authentication (reuse existing NextAuth middleware)
- File size validation prevents DoS attacks
- JSON parsing wrapped in try/catch to handle malformed input
- No new credential storage or transmission
- Sync tokens remain single-use (existing validation logic)

### Error Handling

**Extension**:
- Network errors: "Failed to sync. Check your internet connection."
- Invalid token: "Sync token expired. Return to app to generate a new token."
- API errors: Display specific error message from API response

**Manual Upload**:
- File too large: "File exceeds 5MB limit. Please contact support if your library is very large."
- Invalid JSON: "File format invalid. Please download a fresh export from the extension."
- Parsing errors: "Failed to process file: [specific error]"
- Network errors: "Upload failed. Please try again."

### Performance Optimization

- Extension: No changes needed (existing scraper already optimized)
- Manual upload: Process in single request (no streaming needed for <5MB files)
- Use existing Audnex API caching from `/api/sync/import` logic

---

## Rollout Plan

1. **P1 Implementation**: Extension auto-sync (highest value, enables seamless UX)
2. **P2 Implementation**: Extension fallback UI (prevents user confusion)
3. **P3 Implementation**: Manual upload (provides alternative sync path)

Each phase independently testable and deployable.

---

## Open Questions

None - all technical details resolved through existing implementation patterns.

---

**Status**: Planning complete. Ready for task generation (`/speckit.tasks`).
