# Research: Audible Extension Technical Discovery

**Date**: 2026-02-11
**Research Phase**: Phase 0 - Technical Discovery
**Agent**: Explore (aef302e)

## Summary

Comprehensive research into Audible DOM structure, scraping patterns, and Chrome extension constraints based on analysis of the existing `packages/audible-library-extractor` extension. This document provides all technical details needed to build a simplified extension with reliable data extraction.

## 1. Audible DOM Structure & Selectors

### Decision: Use Existing Extension's Battle-Tested Selectors

**Rationale**: The existing Vue-based extension at `packages/audible-library-extractor` has working selectors that handle Audible's page structure variations. Rather than reverse-engineering from scratch, we'll adapt these proven patterns.

**Key Findings**:

#### Library Page Structure
```javascript
// Entry point
const container = document.querySelector("div.adbl-main");
const rows = container.querySelectorAll("#adbl-library-content-main > .adbl-library-content-row");

// Per-row extraction (basic metadata)
- ASIN: row.querySelector('[data-asin]').getAttribute('data-asin')
- Title: row.querySelector(":scope > div > div > div > div > span > ul > li:nth-child(1)")
- Authors: row.querySelectorAll(".authorLabel a")
- Narrators: row.querySelectorAll(".narratorLabel a")
- Cover: row.querySelector('a > img.bc-image-inset-border:first-of-type')
- Series: row.querySelector(".seriesLabel > span")
- Summary: row.querySelector(".summaryLabel > span")
- Store Link: row.querySelector(":scope > div > div > div > div > span > ul > li:nth-child(1) > a")
```

#### Wishlist Page Structure
```javascript
// Different DOM from library pages
const wishlistRows = document.querySelectorAll('#adbl-library-content-main li.productListItem');

// ASIN extraction has two fallbacks
const asin = row.querySelector('[data-asin]')?.getAttribute('data-asin') ||
             row.querySelector('[id^="product-list-flyout-"]')?.getAttribute('id').replace('product-list-flyout-', '');
```

#### Store Page Detailed Metadata
```javascript
// Always verify correct page before extracting
const samplePlayer = document.querySelector("#sample-player-" + asin) ||
                     document.querySelector(`#jpp-sample-button[data-asin="${asin}"]`);
if (!samplePlayer) { /* Wrong page, skip */ }

// Prioritize JSON-LD over DOM scraping
const jsonBlocks = document.querySelectorAll("#bottom-0 script, adbl-product-metadata > script");
// Then fall back to DOM selectors for missing fields
```

**Alternatives Considered**:
- Manual reverse-engineering of Audible pages - Rejected: too time-consuming, would miss edge cases
- Third-party scraping libraries - Rejected: adds dependencies, not compatible with no-build requirement

---

## 2. JSON-LD Structured Data

### Decision: JSON-LD First, DOM Fallback Strategy

**Rationale**: Audible embeds JSON-LD structured data on store pages, which is more reliable than parsing HTML. However, not all fields are available in JSON-LD, so DOM fallback is required.

**Key Findings**:

#### JSON-LD Location
```javascript
// Primary: #bottom-0 contains multiple <script type="application/ld+json"> blocks
const jsonElements = document.querySelectorAll("#bottom-0 script[type='application/ld+json']");

// Secondary: Product hero/details sections
const productMetadata = document.querySelectorAll('adbl-product-hero adbl-product-metadata > script, ' +
                                                   'adbl-product-details adbl-product-metadata > script');

// Combine all JSON arrays
let combinedData = {};
jsonElements.forEach(el => {
  const json = JSON.parse(el.textContent);
  Object.assign(combinedData, json); // Merge objects
});
```

#### Available Fields in JSON-LD
| Field | JSON-LD | DOM Fallback | Notes |
|-------|---------|--------------|-------|
| name | ✅ | `[slot="title"]` | Title (not subtitle) |
| image | ✅ | `.bc-image-inset-border` | Full URL, extract ID |
| description | ✅ | `.productPublisherSummary` | Summary text |
| datePublished | ✅ | `.releaseDateLabel` | ISO 8601 format |
| duration | ✅ | `.runtimeLabel` | ISO 8601 (PT12H34M) |
| inLanguage | ✅ | `.languageLabel` | Language code |
| format | ✅ | `.format` | "Audiobook" or "Podcast" |
| aggregateRating | ✅ | `.ratingsLabel` | {ratingValue, ratingCount} |
| publisher | ✅ | `.publisherLabel > a` | Array of publishers |
| itemListElement | ✅ | `.categoriesLabel > a` | Categories/breadcrumbs |
| series | ✅ | `.seriesLabel` | Array with book numbers |
| listeningEnhancements | ✅ | `.ws4vLabel` | Whispersync status |

**Note**: Subtitle is NOT in JSON-LD, must be scraped from DOM `[slot="subtitle"]`

**Alternatives Considered**:
- DOM-only scraping - Rejected: less reliable, more brittle to page changes
- JSON-LD-only - Rejected: incomplete data, missing subtitle and user-specific fields

---

## 3. Pagination Patterns

### Decision: URL Parameter-Based Pagination with Pre-Flight Detection

**Rationale**: Audible uses URL parameters for pagination. We must detect the maximum page size and total page count before scraping all pages.

**Key Findings**:

#### Pagination Algorithm
```javascript
// Step 1: Detect max page size from dropdown
const pageSizeDropdown = document.querySelector('select[name="pageSize"]');
const maxPageSize = pageSizeDropdown ?
  parseInt(pageSizeDropdown.querySelector("option:last-of-type").value) : 50;

// Step 2: Fetch first page with max size to get total pages
const url = `https://www.audible.com/library?pageSize=${maxPageSize}&page=1`;
// Parse response for pagination element
const lastPageElement = document.querySelector(".pagingElements .pageNumberElement:last-of-type");
const totalPages = parseInt(lastPageElement.textContent);

// Step 3: Generate page URLs
const pageUrls = Array.from({length: totalPages}, (_, i) =>
  `https://www.audible.com/library?pageSize=${maxPageSize}&page=${i + 1}`
);
```

#### Critical URL Parameters
```javascript
url.query.ale = true;                // Audible Lite Experience (faster pages)
url.query.bp_ua = 'yes';             // Bypass user agent checks
url.query.pageSize = 50;             // Items per page (default, can be 10/25/50)
url.query.page = 1;                  // Current page
url.query.ipRedirectOverride = true; // Prevent geographic redirects
url.query.overrideBaseCountry = true;
```

#### Wishlist Special Case
```javascript
// Wishlist doesn't have pageSize dropdown, must calculate from total count
const wishlistLength = document.querySelector('.adbl-library-refinement-section > div:nth-child(1) span')
  .textContent.match(/\d+/)[0];
const totalPages = Math.ceil(wishlistLength / 50); // Wishlist default pageSize
```

**Alternatives Considered**:
- Infinite scroll detection - Rejected: Audible uses traditional pagination, not infinite scroll
- Hardcoded page count - Rejected: unreliable, breaks for users with many books

---

## 4. React Integration Without Build Tools

### Decision: Load React from CDN via content script

**Rationale**: Chrome Manifest V3 content scripts can load external scripts via DOM injection. Loading React from CDN avoids bundling and keeps extension simple.

**Key Findings**:

#### Loading Pattern
```javascript
// In content-script.js
function loadReact(callback) {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/react@19/umd/react.production.min.js';
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    const scriptDOM = document.createElement('script');
    scriptDOM.src = 'https://unpkg.com/react-dom@19/umd/react-dom.production.min.js';
    scriptDOM.crossOrigin = 'anonymous';
    scriptDOM.onload = callback;
    document.head.appendChild(scriptDOM);
  };
  document.head.appendChild(script);
}

loadReact(() => {
  // Now window.React and window.ReactDOM are available
  renderOverlay();
});
```

#### Isolation Strategy
```javascript
// Content scripts run in isolated world - React won't conflict with page JS
// Create shadow DOM for complete style isolation
const shadowHost = document.createElement('div');
shadowHost.id = 'audible-sync-extension-root';
document.body.appendChild(shadowHost);

const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
const root = ReactDOM.createRoot(shadowRoot);
root.render(<OverlayUI />);
```

**Alternatives Considered**:
- Inline React bundle - Rejected: 140KB uncompressed, bloats extension
- Preact instead of React - Considered: smaller (10KB), but React CDN is fast and familiar
- No framework - Rejected: state management for progress updates becomes complex

---

## 5. Chrome Extension API Constraints (Manifest V3)

### Decision: Content Script + Background Service Worker Architecture

**Rationale**: Manifest V3 has restrictions on content script capabilities. We need a service worker for downloads and cross-origin requests.

**Key Findings**:

#### Content Script Capabilities
- ✅ Can inject UI into Audible pages
- ✅ Can access page DOM (isolated world)
- ✅ Can use chrome.storage API
- ✅ Can make fetch requests to audible.com (same-origin)
- ❌ Cannot use chrome.downloads API (requires background)
- ❌ Cannot make cross-origin requests without host permissions

#### Background Service Worker Required For
```javascript
// Downloads - trigger from content script via message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    chrome.downloads.download({
      url: 'data:application/json;base64,' + btoa(request.json),
      filename: `audible-library-${new Date().toISOString().split('T')[0]}.json`,
      saveAs: true
    });
  }
});
```

#### chrome.storage.local Quota
- **Quota**: 10MB per extension (typically ~50MB in practice)
- **Workaround**: Chunk data into 50-item batches, compress with JSON.stringify
- **Estimate**: 1000 titles with full metadata ≈ 5MB uncompressed, well within limit

**Alternatives Considered**:
- No background script - Rejected: downloads require background API
- IndexedDB instead of chrome.storage - Rejected: chrome.storage persists better across updates

---

## 6. Rate Limiting Implementation

### Decision: Promise Queue with Configurable Delay

**Rationale**: Simple, predictable rate limiting using promise queues. No external libraries needed (axios-rate-limit requires build tools).

**Key Findings**:

#### Implementation Pattern
```javascript
class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.delay = 1000 / requestsPerSecond;
    this.queue = [];
    this.running = false;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      if (!this.running) this.processQueue();
    });
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.running = false;
      return;
    }

    this.running = true;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (err) {
      reject(err);
    }

    setTimeout(() => this.processQueue(), this.delay);
  }
}

// Usage
const limiter = new RateLimiter(10); // 10 req/sec
await limiter.add(() => fetch(url));
```

#### Persistence Across Page Reloads
```javascript
// Save queue state to chrome.storage.local
await chrome.storage.local.set({
  queuedUrls: this.queue.map(item => item.url),
  processedAsins: Array.from(this.processedAsins)
});

// Restore on resume
const { queuedUrls, processedAsins } = await chrome.storage.local.get(['queuedUrls', 'processedAsins']);
```

**Alternatives Considered**:
- axios-rate-limit library - Rejected: requires build tools
- Async iterators with delays - Considered: more modern, but promise queue is simpler and more debuggable

---

## 7. Error Detection Patterns

### Decision: HTTP Status Code + DOM Pattern Detection

**Rationale**: Audible uses standard HTTP codes for errors, but also shows error pages with specific DOM patterns. Detect both.

**Key Findings**:

#### HTTP Status Codes
| Code | Meaning | Action |
|------|---------|--------|
| 429 | Rate limit | Pause 30s, reduce rate, retry |
| 403 | Forbidden / CAPTCHA | Abort, show error |
| 401 | Not authenticated | Abort, show login message |
| 404 | Page not found | Skip (wishlist), mark as missing (store page) |
| 503 | Service unavailable | Retry with backoff |

#### DOM-Based Detection
```javascript
// CAPTCHA detection
const captchaForm = document.querySelector('form[action*="validateCaptcha"]');
const captchaImage = document.querySelector('img[src*="captcha"]');
if (captchaForm || captchaImage) { /* CAPTCHA detected */ }

// Login page detection
const signInForm = document.querySelector('form[name="signIn"]');
const signInUrl = window.location.href.includes('/ap/signin');
if (signInForm || signInUrl) { /* Not logged in */ }

// Store page verification
const samplePlayer = document.querySelector(`#sample-player-${asin}`) ||
                     document.querySelector(`#jpp-sample-button[data-asin="${asin}"]`);
if (!samplePlayer) { /* Wrong page or store page missing */ }
```

#### Retry Strategy (Exponential Backoff)
```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status === 429) {
        await new Promise(r => setTimeout(r, 30000)); // Wait 30s
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000)); // 1s, 2s, 4s
    }
  }
}
```

**Alternatives Considered**:
- Text-based error detection (e.g., "Robot Check") - Rejected: less reliable, text changes by locale
- Network timeout only - Rejected: misses server-side errors

---

## 8. Metadata Normalization

### Decision: Normalize to Canonical JSON Format During Extraction

**Rationale**: Rather than storing raw scraped data and normalizing later, normalize field names and types during extraction. Reduces memory and simplifies download logic.

**Key Findings**:

#### Canonical Field Mapping
```javascript
// Library page fields (basic)
{
  asin: String,              // From [data-asin]
  title: String,             // From title element
  authors: Array<String>,    // From .authorLabel a
  narrators: Array<String>,  // From .narratorLabel a
  coverImageUrl: String,     // From img src (full URL)
  series: {                  // From .seriesLabel
    name: String,
    position: Number
  }
}

// Store page fields (detailed) - merge with library data
{
  subtitle: String,          // From [slot="subtitle"]
  duration: Number,          // Minutes (converted from ISO 8601)
  publisher: String,         // From publisher array[0]
  releaseDate: String,       // ISO 8601
  categories: Array<String>, // From itemListElement
  language: String,          // From inLanguage
  summary: String,           // From description
  rating: Number,            // From aggregateRating.ratingValue
  ratingCount: Number,       // From aggregateRating.ratingCount
  plusCatalog: Boolean,      // From input[value="AudibleDiscovery"]
  whispersync: String        // "available" | "owned" | null
}

// User-specific fields (library page only)
{
  source: "LIBRARY" | "WISHLIST",  // From page type
  personalRating: Number,          // From data-star-count
  listeningProgress: Number,       // Percentage (0-100)
  dateAdded: String                // ISO 8601 (if available)
}
```

#### Type Coercion Rules
```javascript
// Duration: ISO 8601 → minutes
const isoDuration = "PT12H34M56S";
const hours = isoDuration.match(/(\d+)H/)?.[1] || 0;
const minutes = isoDuration.match(/(\d+)M/)?.[1] || 0;
const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);

// Rating: String → Number (1 decimal)
const rating = parseFloat(rawRating).toFixed(1).replace(/\.0$/, '');

// Cover URL: Extract ID only
const coverUrl = "https://m.media-amazon.com/images/I/51Abc123._SL300_.jpg";
const coverId = coverUrl.match(/\/images\/I\/(.*)._SL/)[1]; // "51Abc123"
```

**Alternatives Considered**:
- Store raw HTML, normalize on download - Rejected: wastes storage, complex
- Store both raw and normalized - Rejected: doubles storage requirements

---

## 9. DOMPurify Integration

### Decision: Load DOMPurify from CDN, sanitize all text content

**Rationale**: Audible pages contain user-generated content (reviews, descriptions). Sanitizing prevents XSS in our overlay UI.

**Key Findings**:

```javascript
// Load DOMPurify alongside React
const script = document.createElement('script');
script.src = 'https://unpkg.com/dompurify@3.0.9/dist/purify.min.js';
document.head.appendChild(script);

// Sanitize all extracted text
book.title = DOMPurify.sanitize(rawTitle);
book.summary = DOMPurify.sanitize(rawSummary);

// Custom trimAll utility (remove excessive whitespace)
String.prototype.trimAll = function() {
  return this.trim().replace(/\s+/g, " ");
};

book.title = DOMPurify.sanitize(rawTitle).trimAll();
```

**Alternatives Considered**:
- No sanitization - Rejected: security risk
- Manual sanitization - Rejected: error-prone, incomplete

---

## 10. Scope Boundaries

### Decision: US-Only (audible.com), No Multi-Region Support

**Rationale**: Different Audible regional sites have different DOM structures. Supporting all regions multiplies complexity and testing burden.

**Key Findings**:

#### Regional Differences
| Region | Domain | Differences |
|--------|--------|-------------|
| US | audible.com | Base implementation |
| UK | audible.co.uk | Different breadcrumbs, currency fields |
| DE | audible.de | German text, different categories |
| FR | audible.fr | French text, different layout for some pages |
| AU | audible.com.au | Similar to US but different promo blocks |

**Scope Decision**: Only support audible.com. Extension will check domain and show error if not on audible.com.

```javascript
if (!window.location.hostname.endsWith('audible.com')) {
  showError('This extension only supports audible.com (US). Other regions are not currently supported.');
  return;
}
```

**Alternatives Considered**:
- Multi-region support - Rejected: 5x complexity, requires per-region testing
- Auto-detect region and adapt - Rejected: unreliable, DOM differences too significant

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **DOM Selectors** | Use existing extension's patterns | Battle-tested, handles variations |
| **Metadata Source** | JSON-LD first, DOM fallback | More reliable structured data |
| **Pagination** | URL parameters with detection | Standard Audible pagination |
| **React Loading** | CDN via content script | No build tools, fast CDN |
| **Architecture** | Content script + service worker | Required for downloads API |
| **Rate Limiting** | Promise queue (10 req/sec) | Simple, predictable, no deps |
| **Error Detection** | HTTP codes + DOM patterns | Comprehensive coverage |
| **Normalization** | During extraction | Reduces memory, simpler |
| **Sanitization** | DOMPurify from CDN | Security + no build step |
| **Scope** | US-only (audible.com) | Manageable complexity |

---

## Open Questions Resolved

✅ What are the exact DOM selectors? → Documented in Section 1
✅ How does pagination work? → URL parameters, pre-flight detection (Section 3)
✅ What JSON-LD fields are available? → Comprehensive table in Section 2
✅ Can content scripts make fetch requests? → Yes, same-origin only (Section 5)
✅ chrome.storage.local quota? → 10MB, sufficient for 1000+ titles (Section 5)
✅ Best React loading pattern? → CDN via script injection (Section 4)
✅ How to detect bot/CAPTCHA? → HTTP 403 + DOM patterns (Section 7)

---

## Next Steps

With this research complete, proceed to Phase 1:
1. Generate **data-model.md** - JSON payload schema definition
2. Generate **contracts/extension-output.schema.json** - Formal JSON schema
3. Generate **quickstart.md** - Manual testing scenarios
4. Update agent context with new technologies

**Research Complete**: All technical unknowns resolved. Ready for design phase.
