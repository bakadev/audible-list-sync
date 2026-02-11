/**
 * Wishlist Scraper - Wishlist page pagination and metadata extraction
 *
 * Handles:
 * - Pagination detection and URL generation for wishlist pages
 * - Basic metadata extraction from wishlist rows
 * - Integration with metadata extractor
 */

const WishlistScraper = {
  /**
   * Detect pagination and generate all wishlist page URLs
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

      console.log(`[WishlistScraper] Max page size: ${maxPageSize}`);

      // Step 2: Build URL with max page size
      const baseUrl = new URL(window.location.href);
      baseUrl.searchParams.set('pageSize', maxPageSize);
      baseUrl.searchParams.set('page', '1');

      // Add optimization parameters
      baseUrl.searchParams.set('ale', 'true');
      baseUrl.searchParams.set('bp_ua', 'yes');
      baseUrl.searchParams.set('ipRedirectOverride', 'true');
      baseUrl.searchParams.set('overrideBaseCountry', 'true');

      // Step 3: Fetch page with max page size to get accurate pagination
      console.log(`[WishlistScraper] Fetching page with max page size (${maxPageSize}) to detect pagination...`);
      const firstPageDoc = await this.fetchWishlistPage(baseUrl.toString());

      // Step 4: Parse pagination from the fresh page
      // Audible shows "1-50 of 247 results" instead of page numbers
      const pagingContainer = firstPageDoc.querySelector('.pagingElements');
      let totalPages = 1;

      if (pagingContainer) {
        const paginationText = pagingContainer.textContent;
        console.log(`[WishlistScraper] DEBUG - Pagination text:`, paginationText);

        // Parse "1-50 of 247 results" to get total count
        const match = paginationText.match(/of\s+(\d+)/i);
        if (match) {
          const totalCount = parseInt(match[1]);
          totalPages = Math.ceil(totalCount / maxPageSize);
          console.log(`[WishlistScraper] Total titles: ${totalCount}, Pages: ${totalPages} (${maxPageSize} per page)`);
        } else {
          // Fallback: try to find last page number element
          const allPageElements = pagingContainer.querySelectorAll('.pageNumberElement');
          console.log(`[WishlistScraper] DEBUG - Page number elements found:`, allPageElements.length);

          if (allPageElements.length > 0) {
            // Get all page numbers and find the maximum
            const pageNumbers = Array.from(allPageElements)
              .map(el => parseInt(el.textContent.trim()))
              .filter(num => !isNaN(num));

            if (pageNumbers.length > 0) {
              totalPages = Math.max(...pageNumbers);
              console.log(`[WishlistScraper] Total pages from elements: ${totalPages}`);
            }
          }
        }
      } else {
        console.log('[WishlistScraper] No pagination container found - single page wishlist');
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
      console.error('[WishlistScraper] Pagination detection failed:', error);
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
   * Fetch and parse a wishlist page
   * @param {string} url - Wishlist page URL
   * @returns {Promise<Document>} Parsed HTML document
   */
  async fetchWishlistPage(url) {
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
      console.error('[WishlistScraper] Failed to fetch wishlist page:', error);
      throw error;
    }
  },

  /**
   * Extract wishlist rows from a page document
   * @param {Document} doc - HTML document
   * @returns {Array<Element>} Array of wishlist row elements
   */
  extractWishlistRows(doc) {
    const container = doc.querySelector('div.adbl-main');
    if (!container) {
      console.warn('[WishlistScraper] Wishlist container not found');
      return [];
    }

    // Wishlist uses similar structure to library
    const rows = container.querySelectorAll(
      '#adbl-library-content-main > .adbl-library-content-row'
    );

    console.log(`[WishlistScraper] Found ${rows.length} wishlist rows`);
    return Array.from(rows);
  },

  /**
   * Scrape user-specific metadata from all wishlist rows on a page
   * @param {Document} doc - HTML document
   * @returns {Array<Object>} Array of simplified title data with user-specific fields
   */
  scrapeWishlistPage(doc) {
    const rows = this.extractWishlistRows(doc);
    const titles = [];

    rows.forEach((row, index) => {
      try {
        // Use MetadataExtractor to parse the row
        if (typeof MetadataExtractor === 'undefined') {
          console.error('[WishlistScraper] MetadataExtractor not loaded');
          return;
        }

        const basicData = MetadataExtractor.extractFromWishlistRow(row);
        if (basicData) {
          // Extract user-specific metadata (simplified schema)
          const userRating = MetadataExtractor.extractUserRating(row);
          const status = MetadataExtractor.extractListeningStatus(row, basicData.asin);

          // Build simplified title object with only user-specific fields
          const titleData = {
            asin: basicData.asin,
            title: basicData.title,
            userRating,
            status,
            source: 'WISHLIST',
          };

          titles.push(titleData);
        }
      } catch (error) {
        console.error(`[WishlistScraper] Failed to extract row ${index}:`, error);
      }
    });

    console.log(`[WishlistScraper] Extracted ${titles.length} titles from page`);
    return titles;
  },

  /**
   * Scrape all wishlist pages with pagination
   * @param {Function} onProgress - Progress callback (current, total, titles)
   * @param {Function} onPageComplete - Page complete callback
   * @returns {Promise<Array<Object>>} Array of all wishlist titles
   */
  async scrapeAllPages(onProgress = null, onPageComplete = null) {
    try {
      // Detect pagination
      const pagination = await this.detectPagination();

      const allTitles = [];

      console.log(
        `[WishlistScraper] Starting scrape of ${pagination.totalPages} page(s)`
      );

      for (let i = 0; i < pagination.pageUrls.length; i++) {
        const pageUrl = pagination.pageUrls[i];
        const pageNumber = i + 1;

        console.log(
          `[WishlistScraper] Scraping page ${pageNumber}/${pagination.totalPages}`
        );

        try {
          // Fetch and parse page
          // Use firstPageDoc from pagination detection to avoid duplicate fetch
          const doc =
            pageNumber === 1 && pagination.firstPageDoc
              ? pagination.firstPageDoc
              : await this.fetchWishlistPage(pageUrl);

          // Extract titles from page
          const pageTitles = this.scrapeWishlistPage(doc);
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
            `[WishlistScraper] Failed to scrape page ${pageNumber}:`,
            error
          );
          // Continue with next page even if one fails
        }
      }

      console.log(
        `[WishlistScraper] Completed scraping ${allTitles.length} titles from ${pagination.totalPages} pages`
      );

      return allTitles;
    } catch (error) {
      console.error('[WishlistScraper] Scraping failed:', error);
      throw error;
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
   * Get total wishlist count from page
   * @param {Document} doc - HTML document
   * @returns {number} Total wishlist count
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
      const rows = this.extractWishlistRows(doc);
      return rows.length;
    } catch (error) {
      console.error('[WishlistScraper] Failed to get total count:', error);
      return 0;
    }
  },
};

// Export for browser (window) and Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.WishlistScraper = WishlistScraper;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WishlistScraper;
}
