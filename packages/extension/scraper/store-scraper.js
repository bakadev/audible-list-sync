/**
 * Store Scraper - Store page detailed metadata extraction
 *
 * Fetches individual title store pages (audible.com/pd/ASIN)
 * Extracts detailed metadata using MetadataExtractor
 * Integrates with rate limiter and retry handler
 */

const StoreScraper = {
  /**
   * Fetch and parse a store page
   * @param {string} asin - Title ASIN
   * @param {string} storeUrl - Store page URL (optional)
   * @returns {Promise<Document>} Parsed HTML document
   */
  async fetchStorePage(asin, storeUrl = null) {
    const url = storeUrl || `https://www.audible.com/pd/${asin}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      return doc;
    } catch (error) {
      console.error(`[StoreScraper] Failed to fetch store page for ${asin}:`, error);
      throw error;
    }
  },

  /**
   * Scrape detailed metadata from store page
   * @param {string} asin - Title ASIN
   * @param {string} storeUrl - Store page URL (optional)
   * @returns {Promise<Object|null>} Detailed metadata or null if failed
   */
  async scrapeStorePage(asin, storeUrl = null) {
    try {
      const doc = await this.fetchStorePage(asin, storeUrl);

      // Use MetadataExtractor to parse the store page
      if (typeof MetadataExtractor === 'undefined') {
        console.error('[StoreScraper] MetadataExtractor not loaded');
        return null;
      }

      const metadata = MetadataExtractor.extractFromStorePage(doc, asin);

      if (!metadata) {
        console.warn(`[StoreScraper] Failed to extract metadata for ${asin}`);
        return null;
      }

      return metadata;
    } catch (error) {
      console.error(`[StoreScraper] Store page scraping failed for ${asin}:`, error);

      // Return error info for logging
      return {
        asin,
        error: error.message,
        storePageMissing: true,
      };
    }
  },

  /**
   * Scrape store pages for multiple titles with rate limiting
   * @param {Array<Object>} titles - Array of basic title objects
   * @param {Object} rateLimiter - Rate limiter instance
   * @param {Object} retryHandler - Retry handler instance
   * @param {Function} onProgress - Progress callback (current, total, title)
   * @returns {Promise<Array<Object>>} Array of enriched title objects
   */
  async scrapeStorePages(
    titles,
    rateLimiter,
    retryHandler,
    onProgress = null
  ) {
    const enrichedTitles = [];
    const warnings = [];

    console.log(`[StoreScraper] Starting store page scraping for ${titles.length} titles`);

    for (let i = 0; i < titles.length; i++) {
      const basicTitle = titles[i];

      try {
        // Enqueue store page fetch with rate limiting
        const detailedMetadata = await rateLimiter.enqueue(async () => {
          // Use retry handler for resilience
          return await retryHandler.executeWith429Handling(
            async () => await this.scrapeStorePage(basicTitle.asin, basicTitle.storeUrl),
            {
              context: `Store page ${basicTitle.asin}`,
              onRateLimitDetected: () => {
                console.warn('[StoreScraper] 429 detected - reducing rate');
                // Reduce rate limit by 50%
                const currentRate = rateLimiter.getRate();
                rateLimiter.setRate(Math.max(1, Math.floor(currentRate / 2)));
              },
            }
          );
        });

        // Merge basic and detailed metadata
        // Preserve non-empty arrays from basicTitle if detailedMetadata has empty arrays
        const enrichedTitle = {
          ...basicTitle,
          ...detailedMetadata,
        };

        // Don't overwrite non-empty arrays with empty arrays
        if (basicTitle.authors?.length > 0 && (!detailedMetadata.authors || detailedMetadata.authors.length === 0)) {
          enrichedTitle.authors = basicTitle.authors;
        }
        if (basicTitle.narrators?.length > 0 && (!detailedMetadata.narrators || detailedMetadata.narrators.length === 0)) {
          enrichedTitle.narrators = basicTitle.narrators;
        }
        if (basicTitle.coverImageUrl && !detailedMetadata.coverImageUrl) {
          enrichedTitle.coverImageUrl = basicTitle.coverImageUrl;
        }
        if (basicTitle.title && !detailedMetadata.title) {
          enrichedTitle.title = basicTitle.title;
        }

        // Check for missing store page
        if (detailedMetadata && detailedMetadata.storePageMissing) {
          warnings.push(`Store page missing for ASIN: ${basicTitle.asin} - "${basicTitle.title}"`);
          // Keep basic metadata from library page
          enrichedTitle.storePageMissing = true;
        }

        enrichedTitles.push(enrichedTitle);

        // Progress callback
        if (onProgress) {
          onProgress(i + 1, titles.length, enrichedTitle);
        }
      } catch (error) {
        console.error(
          `[StoreScraper] Failed to enrich title ${basicTitle.asin}:`,
          error
        );

        // Include title with basic metadata only
        enrichedTitles.push({
          ...basicTitle,
          storePageMissing: true,
        });

        warnings.push(
          `Failed to fetch store page for ${basicTitle.asin} - "${basicTitle.title}": ${error.message}`
        );
      }
    }

    console.log(
      `[StoreScraper] Completed enrichment: ${enrichedTitles.length} titles, ${warnings.length} warnings`
    );

    return {
      titles: enrichedTitles,
      warnings,
    };
  },

  /**
   * Scrape store pages in batches
   * @param {Array<Object>} titles - Array of basic title objects
   * @param {Object} rateLimiter - Rate limiter instance
   * @param {Object} retryHandler - Retry handler instance
   * @param {number} batchSize - Batch size
   * @param {Function} onBatchComplete - Batch complete callback
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Scraping result
   */
  async scrapeStorePagesInBatches(
    titles,
    rateLimiter,
    retryHandler,
    batchSize = 10,
    onBatchComplete = null,
    onProgress = null
  ) {
    const allEnrichedTitles = [];
    const allWarnings = [];

    const totalBatches = Math.ceil(titles.length / batchSize);

    console.log(
      `[StoreScraper] Processing ${titles.length} titles in ${totalBatches} batches of ${batchSize}`
    );

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, titles.length);
      const batch = titles.slice(start, end);

      console.log(
        `[StoreScraper] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} titles)`
      );

      // Process batch
      const result = await this.scrapeStorePages(
        batch,
        rateLimiter,
        retryHandler,
        (current, total, title) => {
          const overallCurrent = start + current;
          if (onProgress) {
            onProgress(overallCurrent, titles.length, title);
          }
        }
      );

      allEnrichedTitles.push(...result.titles);
      allWarnings.push(...result.warnings);

      // Batch complete callback
      if (onBatchComplete) {
        await onBatchComplete(batchIndex + 1, totalBatches, result.titles);
      }
    }

    return {
      titles: allEnrichedTitles,
      warnings: allWarnings,
    };
  },

  /**
   * Estimate time to scrape store pages
   * @param {number} titleCount - Number of titles
   * @param {number} requestsPerSecond - Rate limit
   * @returns {Object} Time estimate
   */
  estimateScrapeTime(titleCount, requestsPerSecond = 10) {
    const totalSeconds = titleCount / requestsPerSecond;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return {
      totalSeconds,
      minutes,
      seconds,
      formatted: `${minutes}m ${seconds}s`,
    };
  },
};

// Export for browser (window) and Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.StoreScraper = StoreScraper;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StoreScraper;
}
