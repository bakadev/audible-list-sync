/**
 * JSON Normalizer - Convert scraped data to canonical format
 *
 * Normalizes raw scraped data into the format defined in data-model.md:
 * - Title catalog (unique titles)
 * - User library (user-specific entries)
 * - ASIN deduplication
 * - Type coercion
 * - Null handling
 */

const JSONNormalizer = {
  /**
   * Normalize scraped data to canonical JSON format
   * @param {Object} scrapedData - Raw scraped data
   * @param {Array} scrapedData.titles - Array of title objects
   * @param {number} scrapedData.startTime - Scrape start timestamp
   * @param {Array} scrapedData.warnings - Array of warning messages
   * @param {string} scrapedData.userId - User email (optional)
   * @returns {Object} Normalized JSON payload
   */
  normalize(scrapedData) {
    const { titles, startTime, warnings = [], userId = null } = scrapedData;

    // Deduplicate titles by ASIN
    const uniqueTitles = this.deduplicateTitles(titles);

    // Separate into title catalog and user library
    const titleCatalog = uniqueTitles.map((title) => this.normalizeTitleCatalogEntry(title));
    const userLibrary = uniqueTitles.map((title) => this.normalizeUserLibraryEntry(title));

    // Calculate summary statistics
    const libraryCount = userLibrary.filter((entry) => entry.source === 'LIBRARY').length;
    const wishlistCount = userLibrary.filter((entry) => entry.source === 'WISHLIST').length;

    // Build final payload
    const payload = {
      syncedAt: new Date().toISOString(),
      ...(userId && { userId }), // Include userId only if present
      summary: {
        totalTitles: titleCatalog.length,
        libraryCount,
        wishlistCount,
        scrapeDurationMs: Date.now() - startTime,
        warnings: warnings.filter(Boolean), // Remove null/undefined
      },
      titleCatalog,
      userLibrary,
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
   * Normalize a title for the titleCatalog array
   * @param {Object} title - Title object
   * @returns {Object} Normalized title catalog entry
   */
  normalizeTitleCatalogEntry(title) {
    const catalogEntry = {
      asin: title.asin,
      title: title.title,
      ...(title.subtitle && { subtitle: title.subtitle }),
      authors: title.authors || [],
      narrators: title.narrators || [],
      ...(title.series && { series: title.series }),
      ...(title.duration && { duration: title.duration }),
      ...(title.publisher && { publisher: title.publisher }),
      ...(title.releaseDate && { releaseDate: title.releaseDate }),
      ...(title.categories && title.categories.length > 0 && { categories: title.categories }),
      ...(title.language && { language: title.language }),
      ...(title.summary && { summary: title.summary }),
      coverImageUrl: title.coverImageUrl || '',
      ...(title.rating !== null &&
        title.rating !== undefined && { rating: this.normalizeRating(title.rating) }),
      ...(title.ratingCount !== null &&
        title.ratingCount !== undefined && { ratingCount: title.ratingCount }),
      ...(title.plusCatalog !== undefined && { plusCatalog: title.plusCatalog }),
      ...(title.whispersync && { whispersync: title.whispersync }),
      ...(title.storePageMissing !== undefined && { storePageMissing: title.storePageMissing }),
    };

    return catalogEntry;
  },

  /**
   * Normalize a title for the userLibrary array
   * @param {Object} title - Title object
   * @returns {Object} Normalized user library entry
   */
  normalizeUserLibraryEntry(title) {
    const libraryEntry = {
      asin: title.asin,
      source: title.source || 'LIBRARY', // Default to LIBRARY if not specified
      ...(title.personalRating !== null &&
        title.personalRating !== undefined && { personalRating: title.personalRating }),
      ...(title.listeningProgress !== null &&
        title.listeningProgress !== undefined && {
          listeningProgress: this.normalizeProgress(title.listeningProgress),
        }),
      ...(title.dateAdded && { dateAdded: title.dateAdded }),
    };

    return libraryEntry;
  },

  /**
   * Normalize rating to 1 decimal place
   * @param {number|string} rating - Rating value
   * @returns {number} Normalized rating (0-5, 1 decimal)
   */
  normalizeRating(rating) {
    if (typeof rating === 'string') {
      // Parse "4.5 out of 5 stars" format
      const match = rating.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        rating = parseFloat(match[1]);
      }
    }

    const numRating = parseFloat(rating);
    if (isNaN(numRating)) return null;

    // Round to 1 decimal place
    const rounded = Math.round(numRating * 10) / 10;

    // Clamp to 0-5 range
    return Math.max(0, Math.min(5, rounded));
  },

  /**
   * Normalize listening progress to integer percentage
   * @param {number|string} progress - Progress value
   * @returns {number} Progress percentage (0-100)
   */
  normalizeProgress(progress) {
    const numProgress = parseInt(progress);
    if (isNaN(numProgress)) return 0;

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, numProgress));
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
   * Validate title catalog entry
   * @param {Object} entry - Title catalog entry
   * @returns {Object} Validation result {valid: boolean, errors: Array}
   */
  validateTitleCatalogEntry(entry) {
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

    if (!entry.authors || !Array.isArray(entry.authors) || entry.authors.length === 0) {
      errors.push('Missing required field: authors (must be non-empty array)');
    }

    if (!entry.narrators || !Array.isArray(entry.narrators) || entry.narrators.length === 0) {
      errors.push('Missing required field: narrators (must be non-empty array)');
    }

    if (!entry.coverImageUrl) {
      errors.push('Missing required field: coverImageUrl');
    }

    // Optional field validation
    if (entry.duration !== undefined && (entry.duration < 1 || isNaN(entry.duration))) {
      errors.push('Invalid duration: must be positive integer');
    }

    if (
      entry.rating !== undefined &&
      (entry.rating < 0 || entry.rating > 5 || isNaN(entry.rating))
    ) {
      errors.push('Invalid rating: must be between 0 and 5');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate user library entry
   * @param {Object} entry - User library entry
   * @returns {Object} Validation result {valid: boolean, errors: Array}
   */
  validateUserLibraryEntry(entry) {
    const errors = [];

    // Required fields
    if (!entry.asin) {
      errors.push('Missing required field: asin');
    } else if (!this.isValidAsin(entry.asin)) {
      errors.push(`Invalid ASIN format: ${entry.asin}`);
    }

    if (!entry.source || !['LIBRARY', 'WISHLIST'].includes(entry.source)) {
      errors.push('Missing or invalid source: must be "LIBRARY" or "WISHLIST"');
    }

    // Optional field validation
    if (
      entry.personalRating !== undefined &&
      (entry.personalRating < 0 ||
        entry.personalRating > 5 ||
        !Number.isInteger(entry.personalRating))
    ) {
      errors.push('Invalid personalRating: must be integer 0-5');
    }

    if (
      entry.listeningProgress !== undefined &&
      (entry.listeningProgress < 0 ||
        entry.listeningProgress > 100 ||
        !Number.isInteger(entry.listeningProgress))
    ) {
      errors.push('Invalid listeningProgress: must be integer 0-100');
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
    if (!payload.syncedAt) {
      errors.push('Missing syncedAt timestamp');
    }

    if (!payload.summary) {
      errors.push('Missing summary object');
    }

    if (!Array.isArray(payload.titleCatalog)) {
      errors.push('titleCatalog must be an array');
    }

    if (!Array.isArray(payload.userLibrary)) {
      errors.push('userLibrary must be an array');
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Validate each title catalog entry
    payload.titleCatalog.forEach((entry, index) => {
      const result = this.validateTitleCatalogEntry(entry);
      if (!result.valid) {
        errors.push(`Title catalog entry ${index} (${entry.asin}): ${result.errors.join(', ')}`);
      }
    });

    // Validate each user library entry
    payload.userLibrary.forEach((entry, index) => {
      const result = this.validateUserLibraryEntry(entry);
      if (!result.valid) {
        errors.push(`User library entry ${index} (${entry.asin}): ${result.errors.join(', ')}`);
      }
    });

    // Check for ASIN mismatches
    const catalogAsins = new Set(payload.titleCatalog.map((t) => t.asin));
    payload.userLibrary.forEach((entry) => {
      if (!catalogAsins.has(entry.asin)) {
        warnings.push(`User library references ASIN not in catalog: ${entry.asin}`);
      }
    });

    // Check summary counts
    if (payload.summary.totalTitles !== payload.titleCatalog.length) {
      warnings.push(
        `Summary totalTitles (${payload.summary.totalTitles}) doesn't match catalog length (${payload.titleCatalog.length})`
      );
    }

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
