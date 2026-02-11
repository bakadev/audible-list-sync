/**
 * JSON Normalizer - Convert scraped data to simplified format
 *
 * Normalizes raw scraped data into the simplified format (user-specific data only):
 * - Title catalog with 5 fields: asin, title, userRating, status, source
 * - Summary with counts and metadata
 * - ASIN deduplication
 * - Type coercion and validation
 */

const JSONNormalizer = {
  /**
   * Normalize scraped data to simplified JSON format
   * @param {Object} scrapedData - Raw scraped data
   * @param {Array} scrapedData.titles - Array of title objects
   * @param {number} scrapedData.startTime - Scrape start timestamp
   * @param {Array} scrapedData.warnings - Array of warning messages
   * @returns {Object} Normalized JSON payload
   */
  normalize(scrapedData) {
    const { titles, startTime, warnings = [] } = scrapedData;

    // Deduplicate titles by ASIN (library takes precedence over wishlist)
    const uniqueTitles = this.deduplicateTitles(titles);

    // Normalize each title to simplified 5-field schema
    const titleCatalog = uniqueTitles.map((title) => this.normalizeTitleEntry(title));

    // Calculate summary statistics
    const libraryCount = titleCatalog.filter((entry) => entry.source === 'LIBRARY').length;
    const wishlistCount = titleCatalog.filter((entry) => entry.source === 'WISHLIST').length;

    // Build final payload
    const payload = {
      titleCatalog,
      summary: {
        libraryCount,
        wishlistCount,
        scrapeDurationMs: Date.now() - startTime,
        scrapedAt: new Date().toISOString(),
      },
    };

    return payload;
  },

  /**
   * Deduplicate titles by ASIN
   * Library entries take precedence over wishlist for duplicates
   * @param {Array} titles - Array of title objects
   * @returns {Array} Deduplicated titles
   */
  deduplicateTitles(titles) {
    const titleMap = new Map();

    titles.forEach((title) => {
      const existing = titleMap.get(title.asin);

      if (!existing) {
        titleMap.set(title.asin, title);
      } else {
        // Library takes precedence over wishlist
        if (title.source === 'LIBRARY' && existing.source === 'WISHLIST') {
          titleMap.set(title.asin, title);
        }
        // If both are library or both are wishlist, keep first one (shouldn't happen)
      }
    });

    return Array.from(titleMap.values());
  },

  /**
   * Normalize a title to simplified 5-field schema
   * @param {Object} title - Title object
   * @returns {Object} Normalized title entry
   */
  normalizeTitleEntry(title) {
    return {
      asin: title.asin,
      title: title.title || 'Unknown Title',
      userRating: this.normalizeUserRating(title.userRating),
      status: title.status || 'Not Started',
      source: title.source || 'LIBRARY',
    };
  },

  /**
   * Normalize user rating to integer 0-5
   * @param {number} rating - Rating value
   * @returns {number} Normalized rating (0-5)
   */
  normalizeUserRating(rating) {
    if (rating === null || rating === undefined) return 0;

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating)) return 0;

    // Clamp to 0-5 range
    return Math.max(0, Math.min(5, numRating));
  },

  /**
   * Validate ASIN format
   * @param {string} asin - ASIN to validate
   * @returns {boolean} True if valid ASIN
   */
  isValidAsin(asin) {
    // Accept multiple formats:
    // 1. Standard ASIN: B followed by 9 alphanumeric characters (e.g., B09GHRGYRF)
    // 2. ISBN-10: 10 digits (e.g., 1774241307)
    // 3. ISBN-13: 13 digits (e.g., 9781774241301)
    return /^B[0-9A-Z]{9}$/.test(asin) || /^\d{10}$/.test(asin) || /^\d{13}$/.test(asin);
  },

  /**
   * Validate listening status format
   * @param {string} status - Status to validate
   * @returns {boolean} True if valid status
   */
  isValidStatus(status) {
    const validStatuses = ['Finished', 'Not Started'];
    const timePattern = /^\d+h \d+m left$/; // Pattern: "15h 39m left"

    return (
      typeof status === 'string' &&
      (validStatuses.includes(status) || timePattern.test(status))
    );
  },

  /**
   * Validate title catalog entry
   * @param {Object} entry - Title catalog entry
   * @returns {Object} Validation result {valid: boolean, errors: Array}
   */
  validateTitleEntry(entry) {
    const errors = [];

    // Required fields
    if (!entry.asin) {
      errors.push('Missing required field: asin');
    } else if (!this.isValidAsin(entry.asin)) {
      errors.push(`Invalid ASIN format: ${entry.asin}`);
    }

    if (!entry.title || entry.title.trim().length === 0) {
      errors.push('Missing required field: title');
    }

    if (entry.userRating === undefined || entry.userRating === null) {
      errors.push('Missing required field: userRating');
    } else if (
      !Number.isInteger(entry.userRating) ||
      entry.userRating < 0 ||
      entry.userRating > 5
    ) {
      errors.push('Invalid userRating: must be integer 0-5');
    }

    if (!entry.status) {
      errors.push('Missing required field: status');
    } else if (!this.isValidStatus(entry.status)) {
      errors.push(
        'Invalid status: must be "Finished", "Not Started", or match pattern "Xh Ym left"'
      );
    }

    if (!entry.source || !['LIBRARY', 'WISHLIST'].includes(entry.source)) {
      errors.push('Missing or invalid source: must be "LIBRARY" or "WISHLIST"');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate complete normalized payload
   * @param {Object} payload - Normalized JSON payload
   * @returns {Object} Validation result {valid: boolean, errors: Array, warnings: Array}
   */
  validatePayload(payload) {
    const errors = [];
    const warnings = [];

    // Validate structure
    if (!payload.summary) {
      errors.push('Missing summary object');
    } else {
      if (typeof payload.summary.libraryCount !== 'number') {
        errors.push('Missing or invalid summary.libraryCount');
      }
      if (typeof payload.summary.wishlistCount !== 'number') {
        errors.push('Missing or invalid summary.wishlistCount');
      }
      if (typeof payload.summary.scrapeDurationMs !== 'number') {
        errors.push('Missing or invalid summary.scrapeDurationMs');
      }
      if (!payload.summary.scrapedAt) {
        errors.push('Missing summary.scrapedAt timestamp');
      }
    }

    if (!Array.isArray(payload.titleCatalog)) {
      errors.push('titleCatalog must be an array');
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Validate each title catalog entry
    payload.titleCatalog.forEach((entry, index) => {
      const result = this.validateTitleEntry(entry);
      if (!result.valid) {
        errors.push(`Title catalog entry ${index} (${entry.asin}): ${result.errors.join(', ')}`);
      }
    });

    // Check summary counts match actual data
    const actualLibraryCount = payload.titleCatalog.filter(
      (t) => t.source === 'LIBRARY'
    ).length;
    const actualWishlistCount = payload.titleCatalog.filter(
      (t) => t.source === 'WISHLIST'
    ).length;

    if (payload.summary.libraryCount !== actualLibraryCount) {
      warnings.push(
        `Summary libraryCount (${payload.summary.libraryCount}) doesn't match actual count (${actualLibraryCount})`
      );
    }

    if (payload.summary.wishlistCount !== actualWishlistCount) {
      warnings.push(
        `Summary wishlistCount (${payload.summary.wishlistCount}) doesn't match actual count (${actualWishlistCount})`
      );
    }

    // Check for duplicate ASINs
    const asinSet = new Set();
    payload.titleCatalog.forEach((entry) => {
      if (asinSet.has(entry.asin)) {
        warnings.push(`Duplicate ASIN found: ${entry.asin}`);
      }
      asinSet.add(entry.asin);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

// Export for browser (window) and Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.JSONNormalizer = JSONNormalizer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JSONNormalizer;
}
