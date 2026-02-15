# Research & Technical Decisions

**Feature**: Extension Auto-Sync with Manual Upload Fallback
**Date**: 2026-02-12

## Research Questions & Decisions

### 1. Chrome Extension URL Parameter Access

**Question**: What's the best practice for reading query parameters in content scripts?

**Decision**: Use `URLSearchParams` API

**Rationale**:
- Standard Web API, widely supported in modern browsers
- Clean, declarative syntax: `new URLSearchParams(window.location.search).get('syncToken')`
- No external dependencies needed
- Built-in URL decoding
- Works in content scripts without special permissions

**Alternatives Considered**:
- Manual regex parsing: Error-prone, harder to maintain
- Library (qs, query-string): Unnecessary dependency for simple use case

**Implementation**:
```typescript
function detectSyncToken(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('syncToken')
}
```

---

### 2. File Upload in Next.js App Router

**Question**: What's the recommended approach for handling file uploads in Next.js 16 App Router?

**Decision**: Use native `FormData` with `fetch` API

**Rationale**:
- Next.js 16 App Router supports `FormData` natively in Server Actions and API Routes
- No external dependencies required
- Simple client-side implementation
- Built-in file size validation
- Works with existing authentication middleware

**Alternatives Considered**:
- react-dropzone: Adds unnecessary dependency, more complex than needed for single file upload
- File upload libraries (uploadthing, react-filepond): Overkill for internal admin feature
- Streaming uploads: Not needed for small JSON files (<5MB)

**Implementation**:
```typescript
// Client component
const formData = new FormData()
formData.append('file', file)
await fetch('/api/library/upload', { method: 'POST', body: formData })

// API route
const formData = await request.formData()
const file = formData.get('file') as File
const contents = await file.text()
const data = JSON.parse(contents)
```

---

### 3. Client-Side File Reading

**Question**: How to read JSON file contents in the browser before upload?

**Decision**: Use `FileReader` API

**Rationale**:
- Standard browser API, no dependencies
- Asynchronous, non-blocking
- Can validate file contents before upload
- Works with `<input type="file">`
- Good browser support (all modern browsers)

**Alternatives Considered**:
- Direct File.text() method: Simpler, but less control over error handling
- FileReader is more flexible for future enhancements (progress events, validation)

**Implementation**:
```typescript
const reader = new FileReader()
reader.onload = (e) => {
  const contents = e.target?.result as string
  const data = JSON.parse(contents)
  // Validate and upload
}
reader.readAsText(file)
```

---

### 4. Upload Progress Indication

**Question**: Best UX pattern for showing upload/processing progress?

**Decision**: Optimistic UI with loading state

**Rationale**:
- Simplest approach - no polling, no WebSockets
- Upload happens in single request, typically completes in <30 seconds
- Show loading spinner during upload/processing
- Display result message (success/error) when complete
- Good enough UX for infrequent operation (library sync)

**Alternatives Considered**:
- Polling endpoint for progress: Over-engineered for simple file upload
- WebSocket for real-time updates: Complex infrastructure for minimal benefit
- Progress bar with estimated time: Can't reliably estimate Audnex API latency

**Implementation**:
- Show loading spinner on button click
- Disable upload button during processing
- Display toast/alert on success/error
- Update library count on success

---

### 5. Reuse Existing Sync Logic

**Question**: How to avoid code duplication between extension sync and manual upload?

**Decision**: Extract core import logic from `/api/sync/import` into reusable function

**Rationale**:
- DRY principle - single source of truth for validation and processing
- Consistent behavior between auto-sync and manual upload
- Easier to maintain and test
- Both endpoints can call same internal function

**Implementation**:
```typescript
// lib/sync-import.ts
export async function processSyncImport(userId: string, titles: ImportTitle[]) {
  // Validation
  // Audnex API calls
  // Database operations
  // Return stats
}

// api/sync/import/route.ts (existing)
const result = await processSyncImport(userId, body.titles)

// api/library/upload/route.ts (new)
const result = await processSyncImport(userId, parsedData.titles)
```

---

## Summary

All research questions resolved using standard Web/Node.js APIs with no new external dependencies. Implementation approach is straightforward and leverages existing sync endpoint logic.

**Key Technical Stack**:
- Extension: TypeScript + Chrome Extensions Manifest V3 + URLSearchParams API
- Web App: Next.js 16 + React 19 + FormData API + FileReader API
- No new libraries or frameworks required

**Next Steps**: Proceed to Phase 1 (Data Model & Contracts)
