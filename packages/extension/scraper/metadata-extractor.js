/**
 * Metadata Extractor - JSON-LD parser and DOM fallback
 *
 * Extracts title metadata from Audible pages using:
 * 1. JSON-LD structured data blocks (preferred)
 * 2. DOM selectors (fallback)
 * 3. Field validation and type coercion
 *
 * Based on research.md findings from packages/audible-library-extractor
 */

const MetadataExtractor = {
  /**
   * Extract JSON-LD blocks from store page
   * @param {Document} doc - HTML document
   * @returns {Object} Merged JSON-LD data
   */
  extractJsonLD(doc) {
    const jsonElements = doc.querySelectorAll(
      '#bottom-0 script[type="application/ld+json"], ' +
        'adbl-product-hero adbl-product-metadata > script[type="application/ld+json"], ' +
        'adbl-product-details adbl-product-metadata > script[type="application/ld+json"]'
    );

    let combinedData = {};

    jsonElements.forEach((el) => {
      try {
        const json = JSON.parse(el.textContent);
        // Merge objects, later values override earlier ones
        combinedData = { ...combinedData, ...json };
      } catch (error) {
        console.warn('[MetadataExtractor] Failed to parse JSON-LD block:', error);
      }
    });

    return combinedData;
  },

  /**
   * Extract basic metadata from library page row
   * @param {Element} row - Library page row element
   * @returns {Object} Basic title data
   */
  extractFromLibraryRow(row) {
    try {
      // ASIN (required)
      const asinElement = row.querySelector('[data-asin]');
      if (!asinElement) {
        console.warn('[MetadataExtractor] No ASIN found in library row');
        return null;
      }
      const asin = asinElement.getAttribute('data-asin');

      // Title (required)
      const titleElement = row.querySelector(
        ':scope > div > div > div > div > span > ul > li:nth-child(1)'
      );
      const title = titleElement?.textContent?.trim() || 'Unknown Title';

      // Authors (required)
      const authorElements = row.querySelectorAll('.authorLabel a');
      const authors = Array.from(authorElements).map((el) => el.textContent.trim());

      // Narrators (required)
      const narratorElements = row.querySelectorAll('.narratorLabel a');
      const narrators = Array.from(narratorElements).map((el) =>
        el.textContent.trim()
      );

      // Cover image URL (required)
      const coverImg = row.querySelector('a > img.bc-image-inset-border:first-of-type');
      const coverImageUrl = coverImg?.src || '';

      // Series info (optional)
      const seriesElement = row.querySelector('.seriesLabel > span');
      let series = null;
      if (seriesElement) {
        const seriesText = seriesElement.textContent.trim();
        // Parse "Series Name, Book 1" format
        const match = seriesText.match(/(.+?),\s*Book\s+(.+)/i);
        if (match) {
          series = {
            name: match[1].trim(),
            position: match[2].trim(),
          };
        }
      }

      // Store page link
      const storeLink = row.querySelector(
        ':scope > div > div > div > div > span > ul > li:nth-child(1) > a'
      );
      const storeUrl = storeLink?.href || `https://www.audible.com/pd/${asin}`;

      return {
        asin,
        title,
        authors,
        narrators,
        coverImageUrl,
        series,
        storeUrl,
        source: 'LIBRARY',
      };
    } catch (error) {
      console.error('[MetadataExtractor] Error extracting library row:', error);
      return null;
    }
  },

  /**
   * Extract basic metadata from wishlist row
   * @param {Element} row - Wishlist row element
   * @returns {Object} Basic title data
   */
  extractFromWishlistRow(row) {
    try {
      // ASIN with fallbacks
      const asinElement = row.querySelector('[data-asin]');
      let asin = asinElement?.getAttribute('data-asin');

      if (!asin) {
        // Fallback: extract from product-list-flyout ID
        const flyoutElement = row.querySelector('[id^="product-list-flyout-"]');
        if (flyoutElement) {
          asin = flyoutElement.getAttribute('id').replace('product-list-flyout-', '');
        }
      }

      if (!asin) {
        console.warn('[MetadataExtractor] No ASIN found in wishlist row');
        return null;
      }

      // Title
      const titleElement = row.querySelector('.bc-list-item-title');
      const title = titleElement?.textContent?.trim() || 'Unknown Title';

      // Authors
      const authorElements = row.querySelectorAll('.authorLabel a');
      const authors = Array.from(authorElements).map((el) => el.textContent.trim());

      // Narrators
      const narratorElements = row.querySelectorAll('.narratorLabel a');
      const narrators = Array.from(narratorElements).map((el) =>
        el.textContent.trim()
      );

      // Cover image
      const coverImg = row.querySelector('img.bc-image-inset-border');
      const coverImageUrl = coverImg?.src || '';

      return {
        asin,
        title,
        authors: authors.length > 0 ? authors : ['Unknown'],
        narrators: narrators.length > 0 ? narrators : ['Unknown'],
        coverImageUrl,
        storeUrl: `https://www.audible.com/pd/${asin}`,
        source: 'WISHLIST',
      };
    } catch (error) {
      console.error('[MetadataExtractor] Error extracting wishlist row:', error);
      return null;
    }
  },

  /**
   * Extract detailed metadata from store page
   * @param {Document} doc - Store page HTML document
   * @param {string} asin - Expected ASIN
   * @returns {Object|null} Detailed metadata or null if invalid page
   */
  extractFromStorePage(doc, asin) {
    try {
      // Verify this is the correct store page
      const samplePlayer =
        doc.querySelector(`#sample-player-${asin}`) ||
        doc.querySelector(`#jpp-sample-button[data-asin="${asin}"]`);

      if (!samplePlayer) {
        console.warn('[MetadataExtractor] Store page validation failed - no sample player');
        return null;
      }

      // Extract JSON-LD data
      const jsonLD = this.extractJsonLD(doc);

      // Build metadata object with JSON-LD first, DOM fallback
      // Use DOM fallback if JSON-LD returns empty arrays
      const authorsFromJSON = jsonLD.author ? this.normalizeCreators(jsonLD.author) : [];
      const narratorsFromJSON = jsonLD.readBy ? this.normalizeCreators(jsonLD.readBy) : [];

      const metadata = {
        asin,
        title: jsonLD.name || this.getTextContent(doc, '[slot="title"]'),
        subtitle: this.getTextContent(doc, '[slot="subtitle"]'), // Not in JSON-LD
        authors: authorsFromJSON.length > 0 ? authorsFromJSON : this.extractAuthors(doc),
        narrators: narratorsFromJSON.length > 0 ? narratorsFromJSON : this.extractNarrators(doc),
        series: this.extractSeries(jsonLD, doc),
        duration: this.parseDuration(jsonLD.duration),
        publisher: this.extractPublisher(jsonLD, doc),
        releaseDate: jsonLD.datePublished || this.getTextContent(doc, '.releaseDateLabel'),
        categories: this.extractCategories(jsonLD, doc),
        language: jsonLD.inLanguage || this.getTextContent(doc, '.languageLabel'),
        summary:
          jsonLD.description ||
          this.getTextContent(doc, '.productPublisherSummary > span'),
        coverImageUrl:
          jsonLD.image || doc.querySelector('.bc-image-inset-border')?.src || '',
        rating: jsonLD.aggregateRating?.ratingValue
          ? parseFloat(jsonLD.aggregateRating.ratingValue)
          : null,
        ratingCount: jsonLD.aggregateRating?.ratingCount
          ? parseInt(jsonLD.aggregateRating.ratingCount)
          : null,
        plusCatalog: this.detectPlusCatalog(doc),
        whispersync: this.extractWhispersync(jsonLD, doc),
        storePageMissing: false,
      };

      // Remove null/undefined fields
      return this.cleanMetadata(metadata);
    } catch (error) {
      console.error('[MetadataExtractor] Error extracting store page:', error);
      return null;
    }
  },

  /**
   * Parse ISO 8601 duration to minutes
   * @param {string} duration - ISO 8601 duration (e.g., "PT12H34M")
   * @returns {number|null} Duration in minutes
   */
  parseDuration(duration) {
    if (!duration || typeof duration !== 'string') return null;

    try {
      // Parse PT12H34M format
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (!match) return null;

      const hours = parseInt(match[1] || 0);
      const minutes = parseInt(match[2] || 0);

      return hours * 60 + minutes;
    } catch (error) {
      console.warn('[MetadataExtractor] Failed to parse duration:', duration);
      return null;
    }
  },

  /**
   * Normalize creator arrays (authors/narrators) from JSON-LD
   * @param {Array|Object} creators - Creator data
   * @returns {Array<string>} Array of creator names
   */
  normalizeCreators(creators) {
    if (!creators) return [];
    if (!Array.isArray(creators)) creators = [creators];

    return creators
      .map((c) => (typeof c === 'string' ? c : c.name))
      .filter(Boolean)
      .map((name) => name.trim());
  },

  /**
   * Extract authors from DOM fallback
   * @param {Document} doc - HTML document
   * @returns {Array<string>}
   */
  extractAuthors(doc) {
    const authorElements = doc.querySelectorAll('.authorLabel a');
    return Array.from(authorElements).map((el) => el.textContent.trim());
  },

  /**
   * Extract narrators from DOM fallback
   * @param {Document} doc - HTML document
   * @returns {Array<string>}
   */
  extractNarrators(doc) {
    const narratorElements = doc.querySelectorAll('.narratorLabel a');
    return Array.from(narratorElements).map((el) => el.textContent.trim());
  },

  /**
   * Extract series information
   * @param {Object} jsonLD - JSON-LD data
   * @param {Document} doc - HTML document
   * @returns {Object|null} Series data
   */
  extractSeries(jsonLD, doc) {
    if (jsonLD.series && Array.isArray(jsonLD.series) && jsonLD.series.length > 0) {
      const seriesData = jsonLD.series[0];
      return {
        name: seriesData.name,
        position: seriesData.part || seriesData.position || '1',
      };
    }

    // DOM fallback
    const seriesElement = doc.querySelector('.seriesLabel > span');
    if (seriesElement) {
      const seriesText = seriesElement.textContent.trim();
      const match = seriesText.match(/(.+?),\s*Book\s+(.+)/i);
      if (match) {
        return {
          name: match[1].trim(),
          position: match[2].trim(),
        };
      }
    }

    return null;
  },

  /**
   * Extract publisher
   * @param {Object} jsonLD - JSON-LD data
   * @param {Document} doc - HTML document
   * @returns {string|null}
   */
  extractPublisher(jsonLD, doc) {
    if (jsonLD.publisher) {
      if (Array.isArray(jsonLD.publisher)) {
        return jsonLD.publisher[0]?.name || jsonLD.publisher[0];
      }
      return jsonLD.publisher.name || jsonLD.publisher;
    }

    return this.getTextContent(doc, '.publisherLabel > a');
  },

  /**
   * Extract categories from breadcrumbs
   * @param {Object} jsonLD - JSON-LD data
   * @param {Document} doc - HTML document
   * @returns {Array<string>}
   */
  extractCategories(jsonLD, doc) {
    if (jsonLD.itemListElement && Array.isArray(jsonLD.itemListElement)) {
      return jsonLD.itemListElement
        .map((item) => item.name || item.item?.name)
        .filter(Boolean);
    }

    const categoryElements = doc.querySelectorAll('.categoriesLabel > a');
    return Array.from(categoryElements).map((el) => el.textContent.trim());
  },

  /**
   * Detect Plus Catalog membership
   * @param {Document} doc - HTML document
   * @returns {boolean}
   */
  detectPlusCatalog(doc) {
    // Check for Plus Catalog indicator
    return !!doc.querySelector('[data-testid="plus-catalog-badge"]');
  },

  /**
   * Extract Whispersync status
   * @param {Object} jsonLD - JSON-LD data
   * @param {Document} doc - HTML document
   * @returns {string|null} "available", "owned", or null
   */
  extractWhispersync(jsonLD, doc) {
    if (jsonLD.listeningEnhancements) {
      return 'available';
    }

    const wsLabel = doc.querySelector('.ws4vLabel');
    if (wsLabel) {
      const text = wsLabel.textContent.toLowerCase();
      if (text.includes('owned')) return 'owned';
      return 'available';
    }

    return null;
  },

  /**
   * Get text content from selector with fallback
   * @param {Document} doc - HTML document
   * @param {string} selector - CSS selector
   * @returns {string|null}
   */
  getTextContent(doc, selector) {
    const element = doc.querySelector(selector);
    return element?.textContent?.trim() || null;
  },

  /**
   * Remove null/undefined fields from metadata object
   * @param {Object} metadata - Metadata object
   * @returns {Object} Cleaned metadata
   */
  cleanMetadata(metadata) {
    const cleaned = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== null && value !== undefined && value !== '') {
        // Keep empty arrays but remove empty strings
        if (Array.isArray(value) || value !== '') {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  },

  /**
   * Detect if user is logged in
   * @param {Document} doc - HTML document
   * @returns {boolean}
   */
  isLoggedIn(doc) {
    // Check for login indicators
    const signInLink = doc.querySelector('a[href*="signin"]');
    const accountNav = doc.querySelector('.accountNav');

    return !signInLink || !!accountNav;
  },

  /**
   * Detect CAPTCHA challenge
   * @param {Document} doc - HTML document
   * @returns {boolean}
   */
  detectCaptcha(doc) {
    // Only check for actual CAPTCHA elements, not general text
    return (
      !!doc.querySelector('form[action*="captcha"]') ||
      !!doc.querySelector('#captchacharacters') ||
      !!doc.querySelector('[name="captcha"]') ||
      !!doc.querySelector('.a-box-inner.a-alert-container') &&
        doc.querySelector('.a-box-inner.a-alert-container')?.textContent?.includes('Enter the characters')
    );
  },
};

// Export for browser (window) and Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.MetadataExtractor = MetadataExtractor;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MetadataExtractor;
}
