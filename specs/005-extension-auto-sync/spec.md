# Feature Specification: Extension Auto-Sync with Manual Upload Fallback

**Feature Branch**: `005-extension-auto-sync`
**Created**: 2026-02-12
**Status**: Draft
**Input**: User description: "Extension auto-sync with token detection and manual JSON upload fallback"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Library Sync with Token (Priority: P1)

When a user clicks "Update Library" in the web application and is redirected to Audible with a sync token, the browser extension automatically detects the token, scrapes the library data, and posts it to the API without requiring any manual intervention.

**Why this priority**: This is the primary happy-path experience that makes library synchronization seamless. It eliminates manual steps and provides the best user experience.

**Independent Test**: Can be fully tested by clicking "Update Library" button, being redirected to Audible with a token in the URL, and verifying the extension automatically syncs the library data to the application.

**Acceptance Scenarios**:

1. **Given** user is logged into the web application, **When** user clicks "Update Library" button, **Then** user is redirected to Audible with a sync token in the URL
2. **Given** extension is installed and user lands on Audible with a valid sync token, **When** extension completes library scraping, **Then** extension automatically posts library data to the API endpoint
3. **Given** extension successfully posts data to API, **When** sync completes, **Then** user sees success message and can navigate back to application to view updated library
4. **Given** extension posts data with valid token, **When** API receives the data, **Then** API validates token, processes library entries, and returns success response

---

### User Story 2 - No Token Fallback Message (Priority: P2)

When a user runs the extension on Audible without a sync token (e.g., they navigated to Audible directly instead of through the "Update Library" button), the extension displays a clear message explaining that no token was found and provides options to either download the JSON for manual upload or return to the application to get a token.

**Why this priority**: This handles the common case where users run the extension without going through the proper flow. It provides clear guidance and prevents confusion.

**Independent Test**: Can be tested by navigating directly to Audible (without a sync token) and running the extension, then verifying the informative message appears with actionable options.

**Acceptance Scenarios**:

1. **Given** user navigates directly to Audible (no token in URL), **When** extension completes library scraping, **Then** extension displays message "No sync token found"
2. **Given** no token message is displayed, **When** user views the message, **Then** message explains user can download JSON for manual upload or return to application to get a token
3. **Given** no token message is displayed, **When** user clicks download option, **Then** extension downloads the scraped library data as a JSON file
4. **Given** no token message is displayed, **When** user clicks "Return to Application" option, **Then** user is redirected to the web application's library page

---

### User Story 3 - Manual JSON Upload in Web Application (Priority: P3)

When a user has a downloaded library JSON file (from the extension), they can upload it through a manual upload interface on the library page in the web application, which processes the file and populates their library.

**Why this priority**: This provides a fallback mechanism for users who cannot use the automatic sync (e.g., temporary API issues, token expiration, or preference for manual control).

**Independent Test**: Can be tested by downloading a JSON file from the extension, navigating to the library page, uploading the JSON file, and verifying the library is populated with the correct titles.

**Acceptance Scenarios**:

1. **Given** user is on the library page, **When** user views the page, **Then** user sees a manual upload option (button or file input)
2. **Given** user has a library JSON file, **When** user selects the file and clicks upload, **Then** system validates the JSON structure
3. **Given** valid JSON is uploaded, **When** system processes the file, **Then** system creates library entries for the user using the same logic as automatic sync
4. **Given** upload is successful, **When** processing completes, **Then** user sees success message and updated library content
5. **Given** invalid JSON is uploaded, **When** system attempts to process the file, **Then** user sees clear error message explaining the issue

---

### Edge Cases

- What happens when the sync token is expired?
- What happens when the API is unreachable during auto-sync?
- What happens when the JSON file is malformed or missing required fields?
- What happens when the user tries to upload a JSON file that's too large?
- What happens when the user cancels the extension mid-scrape?
- What happens when the extension detects a token but the user's session has expired?

## Requirements *(mandatory)*

### Functional Requirements

**Extension Requirements**:

- **FR-001**: Extension MUST detect sync token from URL query parameters on Audible pages
- **FR-002**: Extension MUST automatically POST library data to the API endpoint when a valid sync token is present
- **FR-003**: Extension MUST include the sync token in the Authorization header when posting to API
- **FR-004**: Extension MUST display "Sync complete!" message with success status when auto-sync succeeds
- **FR-005**: Extension MUST display "No sync token found" message when token is not present in URL
- **FR-006**: Extension MUST provide "Download JSON" option when no token is found
- **FR-007**: Extension MUST provide "Return to Application" link when no token is found
- **FR-008**: Extension MUST handle API errors gracefully and display user-friendly error messages
- **FR-009**: Extension MUST validate API response and confirm successful sync before showing success message

**Web Application Requirements**:

- **FR-010**: Library page MUST display a manual upload interface for JSON files
- **FR-011**: Upload interface MUST accept JSON files and validate file type before processing
- **FR-012**: System MUST validate uploaded JSON structure matches expected library data format
- **FR-013**: System MUST use the same sync import logic for manual uploads as automatic sync
- **FR-014**: System MUST display upload progress indicator during processing
- **FR-015**: System MUST show success message with count of imported titles after successful upload
- **FR-016**: System MUST show clear error messages for invalid files or processing failures
- **FR-017**: Manual upload MUST require user authentication (same as automatic sync)

### Key Entities

- **Sync Token**: Temporary authentication token generated by web application, passed via URL to extension, used to authorize API requests
- **Library JSON**: Structured data containing user's Audible library (titles, authors, narrators, progress, ratings, etc.)
- **Upload Session**: Represents a manual file upload attempt, tracks validation status, processing progress, and result

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users who click "Update Library" and are redirected to Audible successfully complete automatic sync without manual intervention 95% of the time
- **SC-002**: Users who run extension without a token understand their next steps within 5 seconds of seeing the message
- **SC-003**: Manual JSON upload completes within 30 seconds for libraries up to 500 titles
- **SC-004**: Extension auto-sync reduces user effort from 3 steps (download, navigate, upload) to 1 step (click "Update Library")
- **SC-005**: Error messages provide actionable guidance (e.g., "Token expired - return to application to generate new token") 100% of the time

## Assumptions

- Extension has already implemented library scraping functionality
- Web application has existing sync token generation endpoint
- API endpoint for sync import already exists and validates tokens
- Users have the browser extension installed and enabled
- JSON format from extension matches the structure expected by sync import API
- Users are authenticated in the web application before initiating sync
- Sync tokens have a reasonable expiration time (e.g., 15 minutes)

## Out of Scope

- Modifying the library scraping logic in the extension
- Changes to the sync token generation or validation logic
- Real-time sync or automatic background sync
- Sync conflict resolution (this is a full-replace sync)
- Multi-device sync coordination
- Partial library sync or incremental updates
