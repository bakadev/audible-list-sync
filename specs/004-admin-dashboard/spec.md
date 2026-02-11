# Feature Specification: Admin Dashboard & Data Import

**Feature Branch**: `004-admin-dashboard`
**Created**: 2026-02-11
**Status**: Draft
**Input**: User description: "Admin dashboard with user/title management and Audnex API integration for importing extension data"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Extension Data (Priority: P1)

As a user, I want to import my Audible library data collected by the Chrome extension into the platform so that I can view and manage my audiobook collection.

**Why this priority**: Core feature that enables data flow from extension to platform. Without this, no user data exists in the system to manage. This is the foundation for all other admin features.

**Independent Test**: Upload a JSON file from the extension containing library data, verify titles appear in user's library with correct metadata (ASIN, title, status, progress, ratings). Can be tested by calling the import API endpoint with sample data and querying the library to confirm data persistence.

**Acceptance Scenarios**:

1. **Given** a user has exported their library from the Chrome extension, **When** they POST the JSON data to the import endpoint, **Then** all titles are added to their library with correct user-specific data (ratings, status, progress)
2. **Given** a title's ASIN doesn't exist in the titles database, **When** the import processes that title, **Then** the system fetches full title metadata from Audnex API and creates the title record
3. **Given** a title's ASIN already exists in the user's library, **When** the import processes that title, **Then** the system updates the existing record rather than creating a duplicate
4. **Given** a user imports a library with 100+ titles, **When** the import completes, **Then** the summary shows correct counts for library items (119) and wishlist items (24)

---

### User Story 2 - Admin Access Control (Priority: P2)

As a system administrator, I want automatic admin role assignment and access control so that only authorized users can access administrative functions.

**Why this priority**: Security foundation that must be in place before exposing admin features. Prevents unauthorized access to sensitive operations like deleting user data.

**Independent Test**: Log in as the designated admin user, verify access to admin dashboard. Log in as a non-admin user, verify redirect to library page when attempting to access admin routes.

**Acceptance Scenarios**:

1. **Given** I am the designated admin user (specified in system configuration), **When** I log in, **Then** I am automatically assigned the admin role
2. **Given** I am an admin user, **When** I navigate to /admin, **Then** I see the admin dashboard with navigation to Users and Titles pages
3. **Given** I am a non-admin user, **When** I attempt to access /admin routes, **Then** I am redirected to my library page
4. **Given** I am not logged in, **When** I attempt to access /admin routes, **Then** I am redirected to the sign-in page

---

### User Story 3 - User Library Management (Priority: P3)

As an admin, I want to view and manage all user libraries so that I can troubleshoot issues, review data quality, and perform data cleanup operations.

**Why this priority**: Enables admin oversight and support. Provides visibility into user data and allows targeted interventions when users report problems.

**Independent Test**: Access admin Users page, verify list of all users displays. Click on a user, verify their library data displays with all titles, ratings, and progress. Use "Drop User Library" button, verify all library entries for that user are deleted.

**Acceptance Scenarios**:

1. **Given** I am an admin, **When** I navigate to the Users page, **Then** I see a list of all registered users with their library counts
2. **Given** I am viewing the Users list, **When** I click on a user, **Then** I see their complete library with all titles, including ASIN, title, status, progress, rating, and source (LIBRARY/WISHLIST)
3. **Given** I am viewing a user's library, **When** I click "Drop User Library", **Then** all library entries for that user are permanently deleted and the user's library count resets to zero
4. **Given** I am viewing a user's library, **When** I edit their rating or progress for a title, **Then** the changes are saved and reflected in their library view

---

### User Story 4 - Title Metadata Management (Priority: P4)

As an admin, I want to view and edit title metadata so that I can correct errors, update outdated information, and ensure data quality across the platform.

**Why this priority**: Data quality maintenance. Enables correction of API fetch errors or outdated information without requiring full data reimport.

**Independent Test**: Access admin Titles page, search for a specific title by ASIN or name. Edit title metadata (authors, narrators, description, cover image). Verify changes persist and appear correctly in user libraries.

**Acceptance Scenarios**:

1. **Given** I am an admin, **When** I navigate to the Titles page, **Then** I see a searchable/filterable list of all titles in the database
2. **Given** I am viewing the Titles list, **When** I click on a title, **Then** I see all metadata fields including ASIN, title, subtitle, authors, narrators, series, genres, runtime, description, cover image, ratings, and release date
3. **Given** I am editing a title, **When** I update metadata fields and save, **Then** the changes are reflected across all user libraries that include that title
4. **Given** I am viewing a title, **When** I click "Refresh from Audnex", **Then** the system fetches the latest metadata from the Audnex API and updates the title record

---

### User Story 5 - Database Cleanup Operations (Priority: P5)

As an admin, I want destructive database operations for testing and maintenance so that I can reset data during development and testing phases.

**Why this priority**: Development and testing utility. Not critical for production use but essential for iterative development and test data cleanup.

**Independent Test**: Click "Drop All Titles", verify all title records are deleted and all user libraries are empty. Verify subsequent imports can repopulate the database correctly.

**Acceptance Scenarios**:

1. **Given** I am an admin on the Titles management page, **When** I click "Drop All Titles" and confirm, **Then** all title records are permanently deleted from the database
2. **Given** all titles have been dropped, **When** users view their libraries, **Then** they see empty libraries (library entries reference non-existent titles)
3. **Given** I have dropped all titles, **When** a user performs a new import, **Then** titles are recreated from Audnex API and libraries are repopulated correctly
4. **Given** I am viewing a user's library page, **When** I click "Drop User Library", **Then** only that specific user's library entries are deleted (titles remain in database for other users)

---

### Edge Cases

- What happens when Audnex API is unavailable during import? System should log the error, skip that title, and continue processing remaining titles
- What happens when a user imports the same data twice? System should update existing records rather than create duplicates (based on ASIN matching)
- What happens when an admin drops all titles but users still have library entries? Library views should handle missing title references gracefully (show ASIN, mark as "metadata missing")
- What happens when Audnex API returns invalid or incomplete data for a title? System should store whatever fields are available and mark the title for manual review
- What happens when a user imports data with ASINs that have different formats (B0... vs ISBN-10 vs ISBN-13)? System should normalize ASIN formats and handle all three patterns
- What happens when concurrent imports occur for the same user? System should process imports sequentially or merge results to prevent race conditions

## Requirements *(mandatory)*

### Functional Requirements

**Admin Access & Roles**
- **FR-001**: System MUST automatically assign admin role to the designated user account (configured via environment variable or database flag)
- **FR-002**: System MUST redirect non-admin users attempting to access /admin routes to their library page
- **FR-003**: System MUST display admin navigation (Users, Titles) only to users with admin role

**Data Import**
- **FR-004**: System MUST provide a POST endpoint accepting extension JSON output (titleCatalog array and summary object)
- **FR-005**: System MUST process each title in the import, checking if ASIN exists in user's library before creating new entries
- **FR-006**: System MUST fetch missing title metadata from Audnex API (https://api.audnex.us/books/{asin}) when ASIN not found in titles table
- **FR-007**: System MUST store user-specific data (rating 0-5, status, progress 0-100, timeLeft, source) in library entries
- **FR-008**: System MUST store title metadata (ASIN, title, subtitle, authors, narrators, series, genres, runtime, description, cover image, ratings, release date, publisher, ISBN, language, region) in titles table
- **FR-009**: System MUST handle import of both LIBRARY and WISHLIST source types
- **FR-010**: System MUST update existing library entries if ASIN already exists for that user

**User Management**
- **FR-011**: Admin dashboard MUST display a list of all registered users with library counts
- **FR-012**: Admin MUST be able to click on a user to view their complete library (all titles with user-specific data)
- **FR-013**: Admin MUST be able to edit user's ratings and progress for individual titles
- **FR-014**: Admin MUST be able to drop (delete) all library entries for a specific user via "Drop User Library" button

**Title Management**
- **FR-015**: Admin dashboard MUST display a searchable/filterable list of all titles in the database
- **FR-016**: Admin MUST be able to view complete metadata for any title by clicking on it
- **FR-017**: Admin MUST be able to edit title metadata fields (authors, narrators, description, cover image, etc.)
- **FR-018**: Admin MUST be able to refresh title metadata from Audnex API via "Refresh from Audnex" button
- **FR-019**: Admin MUST be able to drop (delete) all title records from the database via "Drop All Titles" button

**Data Validation & Error Handling**
- **FR-020**: System MUST validate import JSON structure matches extension output schema before processing
- **FR-021**: System MUST log errors when Audnex API requests fail and continue processing remaining titles
- **FR-022**: System MUST validate ASIN formats (B0..., ISBN-10, ISBN-13) and normalize them for consistent storage
- **FR-023**: System MUST validate status enum values ("Finished", "Not Started", "In Progress")
- **FR-024**: System MUST validate progress values (0-100 integer) and rating values (0-5 integer)

### Key Entities

- **User**: Represents a registered user account with optional admin role flag. Related to zero or many LibraryEntries.
- **Title**: Represents an audiobook with metadata from Audnex API. Identified by ASIN (unique). Contains authors (array), narrators (array), series info, genres (array), runtime, description, cover image, aggregate rating, release date, publisher, ISBN, language, region. Related to many LibraryEntries.
- **LibraryEntry**: Join entity representing a user's relationship to a title. Contains user-specific data: userRating (0-5), status (enum: Finished/Not Started/In Progress), progress (0-100), timeLeft (optional string), source (enum: LIBRARY/WISHLIST), timestamps. Links User to Title.
- **SyncHistory**: Audit log of import operations. Contains userId, importDate, titleCount, libraryCount, wishlistCount, durationMs, status (success/partial/failed), errors (array).
- **Author**: Person who wrote the book. Has ASIN and name. Related to many Titles via many-to-many relationship.
- **Narrator**: Person who narrated the audiobook. Has name (no ASIN in Audnex data). Related to many Titles via many-to-many relationship.
- **Genre**: Category or tag for titles. Has ASIN, name, and type (genre or tag). Related to many Titles via many-to-many relationship.
- **Series**: Audiobook series. Has ASIN, name. Titles reference their series with position information.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can import 100+ titles from extension in under 30 seconds (excluding external API fetch time)
- **SC-002**: Admin can view any user's complete library and make edits within 3 clicks
- **SC-003**: System successfully fetches and stores title metadata from Audnex API for 95% of ASINs
- **SC-004**: Import endpoint correctly handles duplicate ASINs without creating duplicate library entries
- **SC-005**: Admin dashboard loads and displays user list in under 2 seconds
- **SC-006**: Only designated admin user can access admin routes (100% access control enforcement)
- **SC-007**: Drop operations (user library, all titles) complete in under 5 seconds regardless of data volume
- **SC-008**: System handles concurrent imports for different users without data corruption

## Scope

### In Scope
- Admin role assignment (automatic for designated user)
- Admin access control (redirects for non-admins)
- Import POST endpoint accepting extension JSON format
- Integration with Audnex API for title metadata
- User library management UI (list, view, edit, delete)
- Title metadata management UI (list, view, edit, refresh)
- Database cleanup operations (drop user library, drop all titles)
- curl command examples for testing import endpoint

### Out of Scope
- Bulk import UI (file upload interface) - will be added in future iteration
- Admin user management (creating/removing other admins)
- Audit logging of admin actions
- Export functionality (download user libraries as JSON)
- Title deduplication for similar ASINs (variant editions)
- Automated Audnex API sync for outdated titles
- Image hosting/caching for cover art
- Search/filter UI for user libraries
- Data migration tools for existing users

## Assumptions

- Current user authentication system (NextAuth) is already configured and working
- Database schema can be extended to add admin role flag to User model
- Audnex API is publicly accessible and does not require authentication
- Audnex API response format matches the sample provided (stable schema)
- Extension JSON output format matches the sample provided (from previous feature 003-simplify-extension)
- Admin user email is known at deployment time (can be configured via environment variable)
- Single admin user is sufficient for MVP (multi-admin support deferred)
- Prisma ORM is the database abstraction layer (based on existing codebase)
- PostgreSQL is the database (based on existing docker-compose.yml)

## Dependencies

- Extension feature 003-simplify-extension must be complete and producing JSON output
- NextAuth authentication must be configured and working
- Database (PostgreSQL) must be running and accessible
- Internet connectivity required for Audnex API integration
- Existing API routes (/api/library, /api/sync) provide foundation for new import endpoint

## Notes

This feature establishes the foundation for admin-level data management and enables testing of the full extension-to-platform data pipeline. The import endpoint is the critical path for all subsequent features, as it populates the database with user library data.

The Audnex API integration eliminates the need for the platform to scrape detailed title metadata, significantly simplifying the architecture. The extension focuses on user-specific data (ratings, progress), while Audnex provides canonical book metadata.

Destructive operations (drop library, drop titles) are intended for development/testing environments. Production deployment should consider additional safeguards (confirmation dialogs, soft deletes, backup procedures).
