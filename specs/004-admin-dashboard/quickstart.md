# Quickstart: Admin Dashboard & Data Import Testing

**Feature**: Admin Dashboard & Data Import
**Branch**: `004-admin-dashboard`
**Date**: 2026-02-11

## Overview

This guide provides manual testing scenarios for the admin dashboard and data import feature. The feature enables administrators to import extension data, manage users and their libraries, view and edit title metadata, and perform database cleanup operations.

The import pipeline transforms simplified extension JSON into a normalized title catalog architecture where shared metadata (from Audnex API) is stored once in the Title table, while user-specific data (ratings, progress, status) lives in LibraryEntry join records.

## Prerequisites

### Environment Setup

1. **Database Running**:
   ```bash
   cd /Users/traviswilson/Development/my-audible-lists
   docker-compose up -d postgres
   ```

2. **Apply Database Migrations**:
   ```bash
   npx prisma migrate dev
   ```

3. **Configure Admin User**:
   ```bash
   # Set admin email in environment
   echo "ADMIN_EMAIL=admin@example.com" >> .env.local
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Verify Server Running**:
   - Navigate to `http://localhost:3000`
   - Verify application loads without errors

### Test Data Requirements

To run all test scenarios, you need:
- Admin user account configured in environment variable
- Regular user account for testing (non-admin)
- Extension JSON output from feature 003-simplify-extension
- Sample library data with 100+ titles (for performance testing)
- Access to Audnex API (https://api.audnex.us/books/{asin})

### Authentication Setup

All API endpoints require authentication. You'll need to:
1. Log in to the application using NextAuth
2. Extract session token from browser cookies
3. Use token in curl requests (see examples below)

**Get Session Token**:
```bash
# In browser DevTools Console (after logging in):
document.cookie.split('; ').find(row => row.startsWith('next-auth.session-token')).split('=')[1]
```

**Set Token as Environment Variable** (for easier testing):
```bash
export SESSION_TOKEN="your-session-token-here"
```

---

## Test Scenarios

### Scenario 1: Import Extension Data - Small Library (P1 - Critical Path)

**Objective**: Verify basic import of user-specific data from extension JSON output.

**User Story**: P1 - Import Extension Data

**Prerequisites**:
- User is authenticated
- Extension has produced JSON output with 3-5 titles
- Database is empty (no existing titles or library entries)

**Steps**:

1. **Prepare Test Data** - Create sample extension JSON:

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

2. **Save JSON to file**:
```bash
cat > /tmp/test-library.json << 'EOF'
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
EOF
```

3. **Import Data via API**:
```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}" \
  -d @/tmp/test-library.json
```

4. **Verify Import Response**:

Expected response:
```json
{
  "success": true,
  "summary": {
    "totalCount": 3,
    "successCount": 3,
    "failureCount": 0,
    "durationMs": 2500,
    "status": "success"
  },
  "errors": []
}
```

5. **Verify Database State** - Check titles were created:
```bash
curl -X GET http://localhost:3000/api/admin/titles \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}"
```

Expected: 3 titles in response with full metadata from Audnex API

6. **Verify User Library** - Check library entries were created:
```bash
# Get your user ID from session or admin users list
USER_ID="clx1a2b3c4d5e6f7g8h9i0j"  # Replace with actual user ID

curl -X GET http://localhost:3000/api/admin/users/${USER_ID} \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}"
```

Expected:
- Library contains 3 entries
- Each entry has correct userRating, status, progress, timeLeft, source
- Title metadata populated from Audnex API (authors, narrators, cover images)

**Expected Results**:
- Import completes successfully with status "success"
- All 3 titles fetched from Audnex API and stored in Title table
- 3 LibraryEntry records created linking user to titles
- User ratings (5, 4, 0) correctly stored in LibraryEntry
- Status values ("Finished", "In Progress", "Not Started") correctly stored
- Source values ("LIBRARY", "WISHLIST") correctly stored
- Title metadata includes authors, narrators, genres, series (from Audnex)
- Import duration < 5 seconds for 3 titles

**Success Criteria**: SC-001, SC-003, FR-004 through FR-010

---

### Scenario 2: Import Extension Data - Duplicate Detection (P1)

**Objective**: Verify import correctly updates existing library entries instead of creating duplicates.

**User Story**: P1 - Import Extension Data (Acceptance Scenario 3)

**Prerequisites**:
- Scenario 1 has been completed (library has 3 titles)
- User is authenticated

**Steps**:

1. **Prepare Updated Library Data** - Same ASINs, different ratings/progress:

```bash
cat > /tmp/test-library-updated.json << 'EOF'
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
      "userRating": 5,
      "status": "Finished",
      "progress": 100,
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
    "scrapedAt": "2026-02-11T16:00:00Z"
  }
}
EOF
```

2. **Import Updated Data**:
```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}" \
  -d @/tmp/test-library-updated.json
```

3. **Verify No Duplicates**:
```bash
curl -X GET http://localhost:3000/api/admin/users/${USER_ID} \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}" \
  | jq '.summary.totalCount'
```

Expected output: `3` (not 6 - no duplicates created)

4. **Verify Updated Ratings**:
```bash
curl -X GET http://localhost:3000/api/admin/users/${USER_ID} \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}" \
  | jq '.library[] | select(.title.asin == "B0FXBHJXPD") | {userRating, status, progress}'
```

Expected output:
```json
{
  "userRating": 5,
  "status": "Finished",
  "progress": 100
}
```

**Expected Results**:
- Import succeeds with 3 titles (same count as before)
- Second title's rating updated from 4 to 5
- Second title's status updated from "In Progress" to "Finished"
- Second title's progress updated from 63 to 100
- No duplicate LibraryEntry records created
- Unique constraint `(userId, titleAsin)` prevents duplicates

**Success Criteria**: SC-004, FR-010

---

### Scenario 3: Import Extension Data - Large Library (P1 - Performance)

**Objective**: Verify import completes in <30 seconds for 100+ titles.

**User Story**: P1 - Import Extension Data (Success Criteria SC-001)

**Prerequisites**:
- Extension JSON file with 100+ titles available
- Database is empty or has been reset
- User is authenticated

**Test Data**: Use actual extension output from your Audible library, or generate test data:

```bash
# Generate 100 test titles (requires jq)
cat > /tmp/large-library.json << 'EOF'
{
  "titleCatalog": [],
  "summary": {
    "libraryCount": 100,
    "wishlistCount": 0,
    "scrapeDurationMs": 45000,
    "scrapedAt": "2026-02-11T16:30:00Z"
  }
}
EOF

# Add 100 test entries (replace with actual ASINs if available)
# This is pseudo-code - you'll need real ASINs for meaningful test
```

**Note**: For this test, use actual extension output with 100+ real ASINs. Audnex API will reject invalid ASINs.

**Steps**:

1. **Record Start Time**:
```bash
START_TIME=$(date +%s)
```

2. **Import Large Library**:
```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}" \
  -d @/path/to/your/100-title-library.json \
  -o /tmp/import-response.json
```

3. **Record End Time and Calculate Duration**:
```bash
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Import duration: ${DURATION} seconds"
```

4. **Verify Import Response**:
```bash
cat /tmp/import-response.json | jq '{success, summary}'
```

Expected:
```json
{
  "success": true,
  "summary": {
    "totalCount": 100,
    "successCount": 95,
    "failureCount": 5,
    "durationMs": 25000,
    "status": "partial"
  }
}
```

Note: Some ASINs may fail if they're region-specific or not in Audnex database (status "partial" is acceptable)

5. **Check Failed Titles**:
```bash
cat /tmp/import-response.json | jq '.errors'
```

6. **Verify Title Count in Database**:
```bash
curl -X GET "http://localhost:3000/api/admin/titles?limit=1" \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}" \
  | jq '.pagination.total'
```

Expected: Should match successCount from import response

**Expected Results**:
- Import completes in <30 seconds (Success Criteria SC-001)
- At least 95% of titles successfully imported (Success Criteria SC-003)
- Failed titles have clear error messages (e.g., "Audnex API returned 404")
- Import response includes detailed summary with success/failure counts
- Database contains Title records for all successful imports
- User's library contains LibraryEntry records for all successful imports
- No timeout errors or database connection failures

**Success Criteria**: SC-001, SC-003, SC-008

---

### Scenario 4: Admin Access Control (P2)

**Objective**: Verify admin role assignment and access control enforcement.

**User Story**: P2 - Admin Access Control

**Prerequisites**:
- Two user accounts: one admin (matching ADMIN_EMAIL), one regular user
- Both users can authenticate

**Steps**:

1. **Test Admin User Login**:
```bash
# Log in as admin user (admin@example.com)
# Extract session token from browser cookies
ADMIN_TOKEN="admin-session-token-here"
```

2. **Verify Admin Access to Users List**:
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}"
```

Expected: 200 OK with list of users

3. **Verify Admin Access to Titles List**:
```bash
curl -X GET http://localhost:3000/api/admin/titles \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}"
```

Expected: 200 OK with list of titles

4. **Test Regular User Login**:
```bash
# Log in as regular user (user@example.com)
# Extract session token from browser cookies
USER_TOKEN="user-session-token-here"
```

5. **Verify Regular User Blocked from Admin Routes**:
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=${USER_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

6. **Verify Regular User Blocked from Titles Route**:
```bash
curl -X GET http://localhost:3000/api/admin/titles \
  -H "Cookie: next-auth.session-token=${USER_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 403 Forbidden

7. **Verify Unauthenticated Access Blocked**:
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**Expected Results**:
- Admin user (matching ADMIN_EMAIL) has isAdmin flag set to true
- Admin user can access all /api/admin/* routes
- Regular user receives 403 Forbidden on admin routes
- Unauthenticated requests receive 401 Unauthorized
- Admin role auto-assigned on login (no manual database update needed)
- Only designated admin email can access admin functions

**Success Criteria**: SC-006, FR-001, FR-002, FR-003

---

### Scenario 5: User Library Management (P3)

**Objective**: Verify admin can view and manage user libraries.

**User Story**: P3 - User Library Management

**Prerequisites**:
- Admin user is authenticated
- At least one regular user has imported library data (from Scenario 1 or 3)

**Steps**:

1. **List All Users**:
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}"
```

Expected response:
```json
{
  "users": [
    {
      "id": "clx1a2b3c4d5e6f7g8h9i0j",
      "email": "user@example.com",
      "name": "Jane Doe",
      "image": "https://example.com/avatar.jpg",
      "isAdmin": false,
      "libraryCount": 143,
      "wishlistCount": 24,
      "lastImportAt": "2026-02-11T10:00:00Z",
      "createdAt": "2026-02-10T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

2. **View User's Complete Library**:
```bash
USER_ID="clx1a2b3c4d5e6f7g8h9i0j"  # From previous response

curl -X GET http://localhost:3000/api/admin/users/${USER_ID} \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '{summary: .summary, sampleEntry: .library[0]}'
```

Expected response includes:
```json
{
  "summary": {
    "totalCount": 167,
    "libraryCount": 143,
    "wishlistCount": 24,
    "finishedCount": 95,
    "inProgressCount": 18,
    "notStartedCount": 54
  },
  "sampleEntry": {
    "id": "clxabc123def456ghi789jkl",
    "userRating": 5,
    "status": "Finished",
    "progress": 100,
    "timeLeft": null,
    "source": "LIBRARY",
    "createdAt": "2026-02-11T10:05:00Z",
    "updatedAt": "2026-02-11T15:20:00Z",
    "title": {
      "asin": "B09GHRGYRF",
      "title": "Project Hail Mary",
      "authors": [{"asin": "B000APZOQA", "name": "Andy Weir"}],
      "narrators": [{"id": "clxnar123", "name": "Ray Porter"}]
    }
  }
}
```

3. **Filter Library by Source**:
```bash
# View only wishlist items
curl -X GET "http://localhost:3000/api/admin/users/${USER_ID}?source=WISHLIST" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.summary.wishlistCount'
```

Expected: Count matches wishlist items only

4. **Filter Library by Status**:
```bash
# View only finished books
curl -X GET "http://localhost:3000/api/admin/users/${USER_ID}?status=Finished" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.summary.finishedCount'
```

Expected: Count matches finished items only

**Expected Results**:
- Admin can view list of all users with library counts
- Admin can click/access individual user to see full library
- Library entries include complete title metadata (authors, narrators, genres)
- Summary statistics (total, library, wishlist, status counts) are accurate
- Filtering by source and status works correctly
- Response includes paginated data for large libraries

**Success Criteria**: SC-002, FR-011, FR-012

---

### Scenario 6: Drop User Library (P3 - Destructive)

**Objective**: Verify admin can delete all library entries for a specific user.

**User Story**: P3 - User Library Management (Acceptance Scenario 3)

**Prerequisites**:
- Admin user is authenticated
- Test user has library data (create test user if needed to avoid deleting real data)

**Steps**:

1. **Verify User Has Library Data**:
```bash
curl -X GET http://localhost:3000/api/admin/users/${USER_ID} \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.summary.totalCount'
```

Expected: Non-zero count (e.g., 167)

2. **Attempt Drop Without Confirmation**:
```bash
curl -X DELETE http://localhost:3000/api/admin/users/${USER_ID}/library \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Confirmation required to drop library",
  "details": {
    "hint": "Add query parameter 'confirm=true' to proceed"
  }
}
```

3. **Drop User Library with Confirmation**:
```bash
curl -X DELETE "http://localhost:3000/api/admin/users/${USER_ID}/library?confirm=true" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}"
```

Expected: 200 OK
```json
{
  "success": true,
  "message": "Library dropped successfully",
  "deletedCount": 167,
  "userId": "clx1a2b3c4d5e6f7g8h9i0j"
}
```

4. **Verify Library is Empty**:
```bash
curl -X GET http://localhost:3000/api/admin/users/${USER_ID} \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.summary'
```

Expected:
```json
{
  "totalCount": 0,
  "libraryCount": 0,
  "wishlistCount": 0,
  "finishedCount": 0,
  "inProgressCount": 0,
  "notStartedCount": 0
}
```

5. **Verify User Record Still Exists**:
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq ".users[] | select(.id == \"${USER_ID}\")"
```

Expected: User record still present (only library entries deleted, not user)

6. **Verify Titles Still Exist in Database** (other users may reference same titles):
```bash
curl -X GET http://localhost:3000/api/admin/titles?limit=1 \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.pagination.total'
```

Expected: Non-zero count (titles preserved for other users)

**Expected Results**:
- Drop operation requires explicit confirmation parameter
- Without confirmation, operation returns 400 Bad Request
- With confirmation, all LibraryEntry records for user are deleted
- User record itself is NOT deleted (only library entries)
- Title records are NOT deleted (shared across users)
- Operation completes in <5 seconds regardless of library size
- Deleted count matches previous library count

**Success Criteria**: SC-007, FR-014

---

### Scenario 7: Title Metadata Management (P4)

**Objective**: Verify admin can view and edit title metadata.

**User Story**: P4 - Title Metadata Management

**Prerequisites**:
- Admin user is authenticated
- Database contains titles (from previous import scenarios)

**Steps**:

1. **List All Titles**:
```bash
curl -X GET "http://localhost:3000/api/admin/titles?limit=10" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}"
```

Expected response:
```json
{
  "titles": [
    {
      "asin": "B09GHRGYRF",
      "title": "Project Hail Mary",
      "subtitle": null,
      "image": "https://m.media-amazon.com/images/I/51D3O9hCVzL.jpg",
      "rating": "4.7 out of 5 stars",
      "releaseDate": "2021-05-04",
      "runtimeLengthMin": 970,
      "authorNames": ["Andy Weir"],
      "narratorNames": ["Ray Porter"],
      "seriesName": null,
      "userCount": 47,
      "createdAt": "2026-02-11T10:00:00Z",
      "updatedAt": "2026-02-11T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

2. **Search for Specific Title**:
```bash
curl -X GET "http://localhost:3000/api/admin/titles?search=Project+Hail+Mary" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}"
```

Expected: Filtered results matching search query

3. **Get Detailed Title Metadata**:
```bash
TITLE_ASIN="B09GHRGYRF"

curl -X GET http://localhost:3000/api/admin/titles/${TITLE_ASIN} \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}"
```

Expected response includes full metadata:
```json
{
  "title": {
    "asin": "B09GHRGYRF",
    "title": "Project Hail Mary",
    "subtitle": null,
    "description": "<p>Ryland Grace is the sole survivor on a desperate, last-chance mission...</p>",
    "summary": "A lone astronaut must save the earth from disaster...",
    "runtimeLengthMin": 970,
    "image": "https://m.media-amazon.com/images/I/51D3O9hCVzL.jpg",
    "rating": "4.7 out of 5 stars",
    "releaseDate": "2021-05-04",
    "publisherName": "Audible Studios",
    "isbn": "9780593135204",
    "language": "en",
    "region": "us",
    "authors": [{"asin": "B000APZOQA", "name": "Andy Weir"}],
    "narrators": [{"id": "clxnar123", "name": "Ray Porter"}],
    "genres": [
      {"asin": "B00NRQP3XM", "name": "Science Fiction", "type": "genre"},
      {"asin": "B07P8R3YXD", "name": "Space Opera", "type": "tag"}
    ],
    "series": null
  },
  "usageStats": {
    "totalUsers": 47,
    "libraryCount": 39,
    "wishlistCount": 8,
    "averageRating": 4.6,
    "finishedCount": 32
  }
}
```

4. **Update Title Metadata**:
```bash
curl -X PUT http://localhost:3000/api/admin/titles/${TITLE_ASIN} \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -d '{
    "title": "Project Hail Mary (Corrected Title)",
    "description": "<p>Updated description for testing purposes...</p>"
  }'
```

Expected: 200 OK with updated title metadata

5. **Verify Title Update Persisted**:
```bash
curl -X GET http://localhost:3000/api/admin/titles/${TITLE_ASIN} \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '{title: .title.title, description: .title.description}'
```

Expected:
```json
{
  "title": "Project Hail Mary (Corrected Title)",
  "description": "<p>Updated description for testing purposes...</p>"
}
```

**Expected Results**:
- Admin can view paginated list of all titles
- Search and filtering work correctly
- Admin can view detailed metadata for any title
- Admin can update editable fields (title, description, etc.)
- Changes persist and are reflected in subsequent queries
- Usage statistics show how many users have each title
- Title updates are reflected in all user libraries (shared metadata)

**Success Criteria**: SC-002, SC-005, FR-015, FR-016, FR-017

---

### Scenario 8: Refresh Title from Audnex API (P4)

**Objective**: Verify admin can refresh title metadata from Audnex API to get latest data.

**User Story**: P4 - Title Metadata Management (Acceptance Scenario 4)

**Prerequisites**:
- Admin user is authenticated
- At least one title exists in database

**Steps**:

1. **Check Current Title Metadata**:
```bash
TITLE_ASIN="B09GHRGYRF"

curl -X GET http://localhost:3000/api/admin/titles/${TITLE_ASIN} \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '{rating: .title.rating, updatedAt: .title.updatedAt}'
```

Note the current rating and updatedAt timestamp

2. **Refresh Title from Audnex**:
```bash
curl -X POST http://localhost:3000/api/admin/titles/${TITLE_ASIN}/refresh \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}"
```

Expected response:
```json
{
  "success": true,
  "message": "Title refreshed successfully",
  "asin": "B09GHRGYRF",
  "updatedFields": [
    "rating",
    "description"
  ],
  "updatedAt": "2026-02-11T16:30:00Z"
}
```

3. **Verify Updated Timestamp**:
```bash
curl -X GET http://localhost:3000/api/admin/titles/${TITLE_ASIN} \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.title.updatedAt'
```

Expected: Newer timestamp than before refresh

4. **Test Refresh for Invalid ASIN**:
```bash
curl -X POST http://localhost:3000/api/admin/titles/B0INVALID1/refresh \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Title not found",
  "details": {
    "asin": "B0INVALID1"
  }
}
```

5. **Test Audnex API Failure** (if possible to simulate):
```bash
# This requires Audnex API to be unavailable or return error
# Document expected behavior: 502 Bad Gateway with error details
```

**Expected Results**:
- Refresh re-fetches metadata from Audnex API
- Updated fields are identified in response
- updatedAt timestamp is updated
- Invalid ASIN returns 404 Not Found
- Audnex API errors return 502 Bad Gateway with details
- User-specific data (ratings, progress) is preserved during refresh

**Success Criteria**: FR-018

---

### Scenario 9: Database Cleanup - Drop All Titles (P5 - Destructive)

**Objective**: Verify admin can delete all title records from database.

**User Story**: P5 - Database Cleanup Operations

**Prerequisites**:
- Admin user is authenticated
- Database contains titles (use test data, not production)

**CAUTION**: This is a destructive operation. Only test on development database with test data.

**Steps**:

1. **Check Current Title Count**:
```bash
curl -X GET "http://localhost:3000/api/admin/titles?limit=1" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.pagination.total'
```

Note the count (e.g., 143 titles)

2. **Attempt Drop Without Confirmation**:
```bash
curl -X DELETE http://localhost:3000/api/admin/titles \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Confirmation required to drop all titles",
  "details": {
    "hint": "Add query parameter 'confirm=DELETE_ALL_TITLES' to proceed"
  }
}
```

3. **Drop All Titles with Confirmation**:
```bash
curl -X DELETE "http://localhost:3000/api/admin/titles?confirm=DELETE_ALL_TITLES" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}"
```

Expected: 200 OK
```json
{
  "success": true,
  "message": "All titles dropped successfully",
  "deletedCount": 143
}
```

4. **Verify All Titles Deleted**:
```bash
curl -X GET "http://localhost:3000/api/admin/titles?limit=1" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.pagination.total'
```

Expected: 0

5. **Verify User Libraries Are Empty** (cascade delete):
```bash
curl -X GET http://localhost:3000/api/admin/users/${USER_ID} \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.summary.totalCount'
```

Expected: 0 (LibraryEntry records cascade deleted)

6. **Verify Users Still Exist**:
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.pagination.total'
```

Expected: Non-zero (users preserved, only titles deleted)

7. **Test Re-Import After Drop**:
```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -d @/tmp/test-library.json
```

Expected: Import succeeds, titles re-created from Audnex API

**Expected Results**:
- Drop requires explicit confirmation string "DELETE_ALL_TITLES"
- Without confirmation, operation returns 400 Bad Request
- With confirmation, all Title records are deleted
- Cascade delete removes LibraryEntry, AuthorOnTitle, NarratorOnTitle records
- User records are preserved
- Operation completes in <5 seconds regardless of data volume
- Subsequent imports can repopulate the database correctly

**Success Criteria**: SC-007, FR-019

---

### Scenario 10: Import Error Handling - Audnex API Failure (Edge Case)

**Objective**: Verify import handles Audnex API failures gracefully and continues processing.

**User Story**: P1 - Import Extension Data (Edge Case)

**Prerequisites**:
- Admin user is authenticated
- Test data includes both valid and invalid ASINs

**Steps**:

1. **Prepare Mixed Validity Test Data**:

```bash
cat > /tmp/mixed-library.json << 'EOF'
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
      "asin": "B0INVALID1",
      "title": "Invalid ASIN Example",
      "userRating": 0,
      "status": "Not Started",
      "progress": 0,
      "source": "WISHLIST"
    },
    {
      "asin": "B0FXBHJXPD",
      "title": "The Anthropocene Reviewed",
      "userRating": 4,
      "status": "In Progress",
      "progress": 63,
      "timeLeft": "15h 39m left",
      "source": "LIBRARY"
    }
  ],
  "summary": {
    "libraryCount": 2,
    "wishlistCount": 1,
    "scrapeDurationMs": 12500,
    "scrapedAt": "2026-02-11T17:00:00Z"
  }
}
EOF
```

2. **Import Mixed Data**:
```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -d @/tmp/mixed-library.json
```

Expected response (partial success):
```json
{
  "success": true,
  "summary": {
    "totalCount": 3,
    "successCount": 2,
    "failureCount": 1,
    "durationMs": 3500,
    "status": "partial"
  },
  "errors": [
    {
      "asin": "B0INVALID1",
      "title": "Invalid ASIN Example",
      "error": "Audnex API returned 404 Not Found"
    }
  ]
}
```

3. **Verify Successful Titles Were Imported**:
```bash
curl -X GET http://localhost:3000/api/admin/users/${USER_ID} \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  | jq '.summary.totalCount'
```

Expected: 2 (valid titles imported despite one failure)

4. **Verify Error Details Logged**:
```bash
# Check SyncHistory table for error details
# This requires database access or dedicated API endpoint (future enhancement)
```

**Expected Results**:
- Import continues processing after encountering Audnex API error
- Valid titles are successfully imported
- Invalid titles are logged in errors array
- Status is "partial" when some titles fail
- Error messages are human-readable and actionable
- Import does not crash or rollback entire transaction
- SyncHistory records the partial success with error details

**Success Criteria**: FR-021, Edge Case handling

---

### Scenario 11: Import Validation - Invalid JSON Schema (Edge Case)

**Objective**: Verify import rejects malformed input and returns clear error messages.

**User Story**: P1 - Import Extension Data (Data Validation)

**Prerequisites**:
- Admin user is authenticated

**Steps**:

1. **Test Missing Required Field (summary)**:
```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -d '{
    "titleCatalog": [
      {
        "asin": "B09GHRGYRF",
        "title": "Project Hail Mary",
        "userRating": 5,
        "status": "Finished",
        "progress": 100,
        "source": "LIBRARY"
      }
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid request body - missing required field 'summary'",
  "details": {
    "field": "summary",
    "constraint": "required"
  }
}
```

2. **Test Invalid ASIN Format**:
```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -d '{
    "titleCatalog": [
      {
        "asin": "INVALID",
        "title": "Test",
        "userRating": 5,
        "status": "Finished",
        "progress": 100,
        "source": "LIBRARY"
      }
    ],
    "summary": {
      "libraryCount": 1,
      "wishlistCount": 0,
      "scrapeDurationMs": 1000,
      "scrapedAt": "2026-02-11T17:00:00Z"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid ASIN format",
  "details": {
    "field": "titleCatalog[0].asin",
    "value": "INVALID",
    "constraint": "Must be 10 alphanumeric characters"
  }
}
```

3. **Test Invalid Status Enum**:
```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -d '{
    "titleCatalog": [
      {
        "asin": "B09GHRGYRF",
        "title": "Test",
        "userRating": 5,
        "status": "InvalidStatus",
        "progress": 100,
        "source": "LIBRARY"
      }
    ],
    "summary": {
      "libraryCount": 1,
      "wishlistCount": 0,
      "scrapeDurationMs": 1000,
      "scrapedAt": "2026-02-11T17:00:00Z"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 400 Bad Request with validation error

4. **Test Invalid Rating (out of range)**:
```bash
curl -X POST http://localhost:3000/api/admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=${ADMIN_TOKEN}" \
  -d '{
    "titleCatalog": [
      {
        "asin": "B09GHRGYRF",
        "title": "Test",
        "userRating": 10,
        "status": "Finished",
        "progress": 100,
        "source": "LIBRARY"
      }
    ],
    "summary": {
      "libraryCount": 1,
      "wishlistCount": 0,
      "scrapeDurationMs": 1000,
      "scrapedAt": "2026-02-11T17:00:00Z"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n"
```

Expected: 400 Bad Request (rating must be 0-5)

**Expected Results**:
- Malformed JSON is rejected before processing
- Missing required fields return 400 with clear error message
- Invalid ASIN format returns 400 with field details
- Invalid enum values (status, source) return 400
- Out-of-range values (rating, progress) return 400
- Error messages identify specific field and constraint
- No database changes occur when validation fails

**Success Criteria**: FR-020, FR-023, FR-024

---

## Validation Checklist

After running all scenarios, verify:

### Functional Requirements Validation

**Admin Access & Roles**:
- [ ] **FR-001**: System automatically assigns admin role to designated user
- [ ] **FR-002**: Non-admin users redirected from /api/admin routes
- [ ] **FR-003**: Admin navigation only visible to admin users

**Data Import**:
- [ ] **FR-004**: POST endpoint accepts extension JSON output
- [ ] **FR-005**: Import checks for existing library entries before creating
- [ ] **FR-006**: Missing titles fetched from Audnex API
- [ ] **FR-007**: User-specific data stored in LibraryEntry
- [ ] **FR-008**: Title metadata stored in Title table
- [ ] **FR-009**: Both LIBRARY and WISHLIST sources handled
- [ ] **FR-010**: Existing library entries updated on re-import

**User Management**:
- [ ] **FR-011**: Admin can view list of all users with counts
- [ ] **FR-012**: Admin can view complete user library
- [ ] **FR-013**: Admin can edit user ratings and progress (if implemented)
- [ ] **FR-014**: Admin can drop user library via button/endpoint

**Title Management**:
- [ ] **FR-015**: Admin can view searchable/filterable title list
- [ ] **FR-016**: Admin can view complete title metadata
- [ ] **FR-017**: Admin can edit title metadata fields
- [ ] **FR-018**: Admin can refresh title from Audnex API
- [ ] **FR-019**: Admin can drop all titles via confirmed endpoint

**Data Validation & Error Handling**:
- [ ] **FR-020**: Import validates JSON structure before processing
- [ ] **FR-021**: Audnex API failures logged, processing continues
- [ ] **FR-022**: ASIN formats validated and normalized
- [ ] **FR-023**: Status enum values validated
- [ ] **FR-024**: Progress (0-100) and rating (0-5) values validated

### Success Criteria Validation

- [ ] **SC-001**: Users import 100+ titles in <30 seconds
- [ ] **SC-002**: Admin views/edits user library within 3 clicks
- [ ] **SC-003**: 95% success rate for Audnex API fetches
- [ ] **SC-004**: Duplicate ASINs don't create duplicate library entries
- [ ] **SC-005**: Admin dashboard loads in <2 seconds
- [ ] **SC-006**: 100% access control enforcement (admin only)
- [ ] **SC-007**: Drop operations complete in <5 seconds
- [ ] **SC-008**: Concurrent imports handled without corruption

### User Story Acceptance Criteria

**P1 - Import Extension Data**:
- [ ] All titles imported with correct user data (ratings, status, progress)
- [ ] Missing ASINs fetch metadata from Audnex API
- [ ] Existing library entries updated (no duplicates)
- [ ] Import summary shows correct counts

**P2 - Admin Access Control**:
- [ ] Admin role auto-assigned on login
- [ ] Admin can access /admin routes
- [ ] Non-admin redirected to library
- [ ] Unauthenticated redirected to sign-in

**P3 - User Library Management**:
- [ ] Admin can view all users with counts
- [ ] Admin can view individual user libraries
- [ ] Admin can edit user data (if implemented)
- [ ] Admin can drop user library

**P4 - Title Metadata Management**:
- [ ] Admin can view/search titles
- [ ] Admin can view detailed metadata
- [ ] Admin can edit title fields
- [ ] Admin can refresh from Audnex

**P5 - Database Cleanup Operations**:
- [ ] Admin can drop all titles with confirmation
- [ ] Users preserved after title drop
- [ ] Re-import works after drop

---

## Troubleshooting

### Import Fails with "Authentication Required"

**Symptom**: Import endpoint returns 401 Unauthorized.

**Solution**:
- Verify you're logged in to the application
- Extract session token from browser cookies
- Include token in curl requests via Cookie header
- Check token hasn't expired (re-login if needed)

### Import Fails with "Admin Access Required"

**Symptom**: Import endpoint returns 403 Forbidden.

**Solution**:
- Verify your email matches ADMIN_EMAIL environment variable
- Check User.isAdmin flag in database (should be true)
- Re-login to trigger admin role assignment
- Verify environment variable is loaded (restart server if changed)

### Audnex API Returns 404 for Valid ASINs

**Symptom**: Import reports "Audnex API returned 404 Not Found" for known ASINs.

**Solution**:
- Check ASIN is from correct region (Audnex may not have all regions)
- Verify ASIN format (10 alphanumeric characters)
- Try fetching directly: `curl https://api.audnex.us/books/{asin}`
- Some ASINs may not be in Audnex database (expected edge case)

### Import Hangs or Times Out

**Symptom**: Import takes >60 seconds or times out for 100+ titles.

**Solution**:
- Check Audnex API availability and response times
- Monitor network requests in browser DevTools
- Verify database connection is stable
- Check for database locking issues (concurrent operations)
- Reduce batch size or implement request throttling

### Drop Operations Don't Require Confirmation

**Symptom**: Drop endpoints delete data without confirmation parameter.

**Solution**:
- This is a bug - drop operations MUST require confirmation
- Check API contract implementation matches spec
- Confirmation should be query parameter: `?confirm=true` or `?confirm=DELETE_ALL_TITLES`

### User Libraries Show Empty After Title Drop

**Symptom**: User libraries have 0 titles after admin drops all titles.

**Solution**:
- This is expected behavior (cascade delete)
- LibraryEntry records reference Title records (foreign key)
- When Title is deleted, LibraryEntry is cascade deleted
- Re-import user data to repopulate library

---

## Performance Benchmarks

Record actual performance for your system:

| Operation | Target | Actual | Pass/Fail |
|-----------|--------|--------|-----------|
| Import 10 titles | <5s | ___ s | ___ |
| Import 100 titles | <30s | ___ s | ___ |
| List 1000 titles | <2s | ___ s | ___ |
| View user library (100 titles) | <2s | ___ s | ___ |
| Drop user library (100 entries) | <5s | ___ s | ___ |
| Drop all titles (1000 titles) | <5s | ___ s | ___ |
| Refresh title from Audnex | <2s | ___ s | ___ |

---

## Sample Test Data

### Sample Extension JSON (Small Library)

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

### Sample Audnex API Response

```json
{
  "asin": "B09GHRGYRF",
  "title": "Project Hail Mary",
  "subtitle": null,
  "authors": [
    {
      "asin": "B000APZOQA",
      "name": "Andy Weir"
    }
  ],
  "narrators": [
    {
      "name": "Ray Porter"
    }
  ],
  "description": "<p>Ryland Grace is the sole survivor on a desperate, last-chance mission...</p>",
  "summary": "A lone astronaut must save the earth from disaster in this incredible new science-based thriller.",
  "runtimeLengthMin": 970,
  "image": "https://m.media-amazon.com/images/I/51D3O9hCVzL.jpg",
  "rating": "4.7 out of 5 stars",
  "releaseDate": "2021-05-04",
  "publisherName": "Audible Studios",
  "isbn": "9780593135204",
  "language": "en",
  "region": "us",
  "genres": [
    {
      "asin": "B00NRQP3XM",
      "name": "Science Fiction",
      "type": "genre"
    },
    {
      "asin": "B07P8R3YXD",
      "name": "Space Opera",
      "type": "tag"
    }
  ],
  "seriesPrimary": null
}
```

---

## Next Steps

After completing quickstart testing:

1. **Document Results**: Record which scenarios passed/failed in validation checklist
2. **Log Issues**: Create GitHub issues for any failed scenarios with reproduction steps
3. **Performance Baselines**: Record actual timings in performance benchmarks table
4. **Edge Case Testing**: Test with region-specific ASINs, international characters, very large libraries
5. **Security Testing**: Verify access control is enforced across all endpoints
6. **Integration Testing**: Test full workflow from extension to admin dashboard
7. **User Acceptance**: Have test users validate admin dashboard UX and workflows

---

## Additional Resources

- **OpenAPI Contracts**: `/specs/004-admin-dashboard/contracts/*.yaml`
- **Data Model**: `/specs/004-admin-dashboard/data-model.md`
- **Feature Spec**: `/specs/004-admin-dashboard/spec.md`
- **Audnex API Docs**: https://api.audnex.us/
- **Extension Schema**: `/specs/003-simplify-extension/contracts/extension-output.schema.json`
- **Prisma Studio**: `npx prisma studio` (visual database browser)
