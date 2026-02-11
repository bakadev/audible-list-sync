/**
 * Library Scraper - Library page pagination and metadata extraction
 *
 * Handles:
 * - Pagination detection and URL generation
 * - Basic metadata extraction from library rows
 * - Integration with metadata extractor
 */

const LibraryScraper = {
  /**
   * Detect pagination and generate all page URLs
   * @returns {Promise<Object>} Pagination info {totalPages, pageSize, pageUrls}
   */
  async detectPagination() {
    try {
      // Step 1: Detect max page size from dropdown
      const pageSizeDropdown = document.querySelector('select[name="pageSize"]');
      const maxPageSize = pageSizeDropdown
        ? parseInt(
            pageSizeDropdown.querySelector('option:last-of-type').value
          )
        : 50;

      console.log(`[LibraryScraper] Max page size: ${maxPageSize}`);

      // Step 2: Build URL with max page size
      const baseUrl = new URL(window.location.href);
      baseUrl.searchParams.set('pageSize', maxPageSize);
      baseUrl.searchParams.set('page', '1');

      // Add optimization parameters from research
      baseUrl.searchParams.set('ale', 'true'); // Audible Lite Experience
      baseUrl.searchParams.set('bp_ua', 'yes'); // Bypass user agent checks
      baseUrl.searchParams.set('ipRedirectOverride', 'true');
      baseUrl.searchParams.set('overrideBaseCountry', 'true');

      // Step 3: Fetch page with max page size to get accurate pagination
      console.log(`[LibraryScraper] Fetching page with max page size (${maxPageSize}) to detect pagination...`);
      const firstPageDoc = await this.fetchLibraryPage(baseUrl.toString());

      // Step 4: Parse pagination from the fresh page
      // Audible shows "1-50 of 247 results" instead of page numbers
      const pagingContainer = firstPageDoc.querySelector('.pagingElements');
      let totalPages = 1;

      if (pagingContainer) {
        const paginationText = pagingContainer.textContent;
        console.log(`[LibraryScraper] DEBUG - Pagination text:`, paginationText);

        // Parse "1-50 of 247 results" to get total count
        const match = paginationText.match(/of\s+(\d+)/i);
        if (match) {
          const totalCount = parseInt(match[1]);
          totalPages = Math.ceil(totalCount / maxPageSize);
          console.log(`[LibraryScraper] Total titles: ${totalCount}, Pages: ${totalPages} (${maxPageSize} per page)`);
        } else {
          // Fallback: try to find last page number element
          const allPageElements = pagingContainer.querySelectorAll('.pageNumberElement');
          console.log(`[LibraryScraper] DEBUG - Page number elements found:`, allPageElements.length);

          if (allPageElements.length > 0) {
            // Get all page numbers and find the maximum
            const pageNumbers = Array.from(allPageElements)
              .map(el => parseInt(el.textContent.trim()))
              .filter(num => !isNaN(num));

            if (pageNumbers.length > 0) {
              totalPages = Math.max(...pageNumbers);
              console.log(`[LibraryScraper] Total pages from elements: ${totalPages}`);
            }
          }
        }
      } else {
        console.log('[LibraryScraper] No pagination container found - single page library');
      }

      // Step 5: Generate page URLs
      const pageUrls = Array.from({ length: totalPages }, (_, i) => {
        const pageUrl = new URL(baseUrl);
        pageUrl.searchParams.set('page', (i + 1).toString());
        return pageUrl.toString();
      });

      return {
        totalPages,
        pageSize: maxPageSize,
        pageUrls,
        firstPageDoc, // Return the fetched document so we don't need to fetch it again
      };
    } catch (error) {
      console.error('[LibraryScraper] Pagination detection failed:', error);
      // Fallback: return current page only
      return {
        totalPages: 1,
        pageSize: 50,
        pageUrls: [window.location.href],
        firstPageDoc: null,
      };
    }
  },

  /**
   * Fetch and parse a library page
   * @param {string} url - Library page URL
   * @returns {Promise<Document>} Parsed HTML document
   */
  async fetchLibraryPage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      return doc;
    } catch (error) {
      console.error('[LibraryScraper] Failed to fetch library page:', error);
      throw error;
    }
  },

  /**
   * Extract library rows from a page document
   * @param {Document} doc - HTML document
   * @returns {Array<Element>} Array of library row elements
   */
  extractLibraryRows(doc) {
    const container = doc.querySelector('div.adbl-main');
    if (!container) {
      console.warn('[LibraryScraper] Library container not found');
      return [];
    }

    const rows = container.querySelectorAll(
      '#adbl-library-content-main > .adbl-library-content-row'
    );

    console.log(`[LibraryScraper] Found ${rows.length} library rows`);
    return Array.from(rows);
  },

  /**
   * Scrape basic metadata from all library rows on a page
   * @param {Document} doc - HTML document
   * @returns {Array<Object>} Array of basic title data
   */
  scrapeLibraryPage(doc) {
    const rows = this.extractLibraryRows(doc);
    const titles = [];

    rows.forEach((row, index) => {
      try {
        // Use MetadataExtractor to parse the row
        if (typeof MetadataExtractor === 'undefined') {
          console.error('[LibraryScraper] MetadataExtractor not loaded');
          return;
        }

        const titleData = MetadataExtractor.extractFromLibraryRow(row);
        if (titleData) {
          titles.push(titleData);
        }
      } catch (error) {
        console.error(`[LibraryScraper] Failed to extract row ${index}:`, error);
      }
    });

    console.log(`[LibraryScraper] Extracted ${titles.length} titles from page`);
    return titles;
  },

  /**
   * Scrape all library pages with pagination
   * @param {Function} onProgress - Progress callback (current, total, titles)
   * @param {Function} onPageComplete - Page complete callback
   * @param {boolean} currentPageOnly - If true, only scrape current page without pagination
   * @returns {Promise<Array<Object>>} Array of all library titles
   */
  async scrapeAllPages(onProgress = null, onPageComplete = null, currentPageOnly = false) {
    try {
      let pagination;

      if (currentPageOnly) {
        // Skip pagination detection - just scrape current page
        console.log('[LibraryScraper] Current page only mode - skipping pagination');
        pagination = {
          totalPages: 1,
          pageSize: null,
          pageUrls: [window.location.href],
          firstPageDoc: document,
        };
      } else {
        // Detect pagination
        pagination = await this.detectPagination();
      }

      const allTitles = [];

      console.log(
        `[LibraryScraper] Starting scrape of ${pagination.totalPages} page(s)`
      );

      for (let i = 0; i < pagination.pageUrls.length; i++) {
        const pageUrl = pagination.pageUrls[i];
        const pageNumber = i + 1;

        console.log(
          `[LibraryScraper] Scraping page ${pageNumber}/${pagination.totalPages}`
        );

        try {
          // Fetch and parse page
          // Use firstPageDoc from pagination detection to avoid duplicate fetch
          const doc =
            pageNumber === 1 && pagination.firstPageDoc
              ? pagination.firstPageDoc
              : await this.fetchLibraryPage(pageUrl);

          // Extract titles from page
          const pageTitles = this.scrapeLibraryPage(doc);
          allTitles.push(...pageTitles);

          // Call progress callback
          if (onProgress) {
            onProgress(pageNumber, pagination.totalPages, pageTitles);
          }

          // Call page complete callback
          if (onPageComplete) {
            await onPageComplete(pageNumber, pageTitles);
          }

          // Add small delay between pages to avoid overwhelming server
          if (pageNumber < pagination.totalPages) {
            await this.sleep(500);
          }
        } catch (error) {
          console.error(
            `[LibraryScraper] Failed to scrape page ${pageNumber}:`,
            error
          );
          // Continue with next page even if one fails
        }
      }

      console.log(
        `[LibraryScraper] Completed scraping ${allTitles.length} titles from ${pagination.totalPages} pages`
      );

      return allTitles;
    } catch (error) {
      console.error('[LibraryScraper] Scraping failed:', error);
      throw error;
    }
  },

  /**
   * Extract user-specific metadata from library row
   * @param {Element} row - Library row element
   * @returns {Object|null} User metadata
   */
  extractUserMetadata(row) {
    try {
      // Personal rating (star rating)
      const ratingElement = row.querySelector('[data-star-count]');
      const personalRating = ratingElement
        ? parseInt(ratingElement.getAttribute('data-star-count'))
        : null;

      // Listening progress
      const progressBar = row.querySelector('[role="progressbar"]');
      const listeningProgress = progressBar
        ? parseInt(progressBar.getAttribute('aria-valuenow') || 0)
        : 0;

      // Date added (if available)
      const dateAddedElement = row.querySelector('.dateAddedLabel');
      const dateAdded = dateAddedElement
        ? this.parseDateAdded(dateAddedElement.textContent)
        : null;

      return {
        personalRating,
        listeningProgress,
        dateAdded,
      };
    } catch (error) {
      console.error('[LibraryScraper] Failed to extract user metadata:', error);
      return null;
    }
  },

  /**
   * Parse "Added: MM/DD/YYYY" format to ISO 8601
   * @param {string} dateText - Date text
   * @returns {string|null} ISO 8601 date
   */
  parseDateAdded(dateText) {
    try {
      // Match various date formats
      const match = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, month, day, year] = match;
        return new Date(`${year}-${month}-${day}`).toISOString();
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Get total library count from page
   * @param {Document} doc - HTML document
   * @returns {number} Total library count
   */
  getTotalCount(doc = document) {
    try {
      // Look for "1-50 of 247 results" text
      const paginationText = doc.querySelector('.pagingElements')?.textContent;
      if (paginationText) {
        const match = paginationText.match(/of\s+(\d+)/i);
        if (match) {
          return parseInt(match[1]);
        }
      }

      // Fallback: count rows on current page
      const rows = this.extractLibraryRows(doc);
      return rows.length;
    } catch (error) {
      console.error('[LibraryScraper] Failed to get total count:', error);
      return 0;
    }
  },
};

// Export for browser (window) and Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.LibraryScraper = LibraryScraper;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LibraryScraper;
}
