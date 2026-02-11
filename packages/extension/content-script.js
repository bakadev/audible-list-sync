/**
 * Content Script - Main entry point
 *
 * Injected on audible.com/library* and audible.com/wl*
 * Coordinates:
 * - Module loading
 * - Overlay UI initialization
 * - Library/wishlist scraping workflow
 * - Progress tracking and state management
 * - JSON download
 */

(async function () {
  'use strict';

  console.log('[AudibleExtension] Content script loaded');

  // Wait for page to be fully loaded
  if (document.readyState !== 'complete') {
    await new Promise((resolve) => {
      window.addEventListener('load', resolve);
    });
  }

  // Check if we're on a valid Audible page
  const currentUrl = window.location.href;
  const isLibraryPage = currentUrl.includes('audible.com/library');
  const isWishlistPage = currentUrl.includes('audible.com/wl');

  if (!isLibraryPage && !isWishlistPage) {
    console.log('[AudibleExtension] Not on library or wishlist page, exiting');
    return;
  }

  // All modules are loaded by manifest.json, verify they're available
  console.log('[AudibleExtension] Verifying modules...');
  console.log('  RateLimiter:', typeof RateLimiter);
  console.log('  RetryHandler:', typeof RetryHandler);
  console.log('  StorageManager:', typeof StorageManager);
  console.log('  LibraryScraper:', typeof LibraryScraper);
  console.log('  WishlistScraper:', typeof WishlistScraper);
  console.log('  OverlayUI:', typeof OverlayUI);

  // Extension state
  const extensionState = {
    scraping: false,
    paused: false,
    scrapedTitles: [],
    startTime: null,
    sessionId: null,
    warnings: [],
  };

  // Create module instances
  const rateLimiter = new RateLimiter(10); // Default 10 req/sec
  const retryHandler = new RetryHandler(3, 1000);

  // Initialize overlay UI
  await OverlayUI.init({
    onStartSync: handleStartSync,
    onPauseSync: handlePauseSync,
    onDownload: handleDownload,
    onSettingsChange: handleSettingsChange,
  });

  // Load saved settings
  try {
    const settings = await StorageManager.loadSettings();
    OverlayUI.setState({ settings });
    rateLimiter.setRate(settings.rateLimit || 10);
  } catch (error) {
    console.error('[AudibleExtension] Failed to load settings:', error);
  }

  console.log('[AudibleExtension] Initialization complete');

  /**
   * Handle Start Sync button click
   */
  async function handleStartSync() {
    if (extensionState.scraping) {
      console.warn('[AudibleExtension] Scraping already in progress');
      return;
    }

    console.log('[AudibleExtension] Starting sync...');

    // Check if user is logged in
    const isLoggedIn = MetadataExtractor.isLoggedIn(document);
    if (!isLoggedIn) {
      OverlayUI.setError(
        'Not logged in to Audible. Please log in and try again.'
      );
      return;
    }

    // Check for CAPTCHA
    const hasCaptcha = MetadataExtractor.detectCaptcha(document);
    if (hasCaptcha) {
      OverlayUI.setError(
        'CAPTCHA detected. Please solve any challenges on the Audible page, then click Start Sync to restart.'
      );
      return;
    }

    // Initialize scraping state
    extensionState.scraping = true;
    extensionState.startTime = Date.now();
    extensionState.sessionId = generateSessionId();
    extensionState.scrapedTitles = [];
    extensionState.warnings = [];

    try {
      // Get current settings
      const settings = await StorageManager.loadSettings();
      const currentPageOnly = settings.currentPageOnly || false;

      // Phase 1: Scrape library pages for basic metadata
      OverlayUI.setScraping({
        phase: currentPageOnly ? 'Scraping current page only...' : 'Detecting pagination...',
        progress: 0,
        scrapedCount: 0,
        totalCount: 0,
      });

      const libraryTitles = await LibraryScraper.scrapeAllPages(
        (currentPage, totalPages, pageTitles) => {
          console.log(
            `[AudibleExtension] Library page ${currentPage}/${totalPages} complete`
          );
          OverlayUI.setScraping({
            phase: `Scraping library page ${currentPage} of ${totalPages}...`,
            progress: (currentPage / totalPages) * 50, // 0-50% for library pages
            scrapedCount: extensionState.scrapedTitles.length,
            totalCount: LibraryScraper.getTotalCount(),
          });
        },
        async (pageNumber, pageTitles) => {
          // Save progress after each page
          extensionState.scrapedTitles.push(...pageTitles);
          await saveProgress();
        },
        currentPageOnly
      );

      console.log(
        `[AudibleExtension] Library scraping complete: ${libraryTitles.length} titles`
      );

      // Phase 1.5: Scrape wishlist (if not in current page only mode)
      let wishlistTitles = [];
      if (!currentPageOnly) {
        try {
          OverlayUI.setScraping({
            phase: 'Fetching wishlist...',
            progress: 33,
            scrapedCount: 0,
            totalCount: 0,
          });

          // Fetch wishlist page
          const wishlistUrl = 'https://www.audible.com/wl';
          const wishlistResponse = await fetch(wishlistUrl);

          if (wishlistResponse.ok) {
            const wishlistHtml = await wishlistResponse.text();
            const parser = new DOMParser();
            const wishlistDoc = parser.parseFromString(wishlistHtml, 'text/html');

            // Check if wishlist is accessible (not empty or error page)
            const wishlistContainer = wishlistDoc.querySelector('div.adbl-main');
            if (wishlistContainer) {
              console.log('[AudibleExtension] Wishlist accessible, starting scrape...');

              wishlistTitles = await WishlistScraper.scrapeAllPages(
                (currentPage, totalPages, pageTitles) => {
                  console.log(
                    `[AudibleExtension] Wishlist page ${currentPage}/${totalPages} complete`
                  );
                  OverlayUI.setScraping({
                    phase: `Scraping wishlist page ${currentPage} of ${totalPages}...`,
                    progress: 33 + (currentPage / totalPages) * 17, // 33-50% for wishlist pages
                    scrapedCount: wishlistTitles.length,
                    totalCount: WishlistScraper.getTotalCount(),
                  });
                },
                async (pageNumber, pageTitles) => {
                  // Save progress after each page
                  await saveProgress();
                },
                false // currentPageOnly = false for wishlist
              );

              console.log(
                `[AudibleExtension] Wishlist scraping complete: ${wishlistTitles.length} titles`
              );
            } else {
              console.log('[AudibleExtension] Wishlist not accessible or empty');
            }
          } else if (wishlistResponse.status === 404 || wishlistResponse.status === 403) {
            console.log('[AudibleExtension] Wishlist not available (404/403)');
          }
        } catch (error) {
          console.warn('[AudibleExtension] Wishlist scraping failed (non-fatal):', error);
          // Continue with library-only scraping
        }
      } else {
        console.log('[AudibleExtension] Skipping wishlist in current page only mode');
      }

      // Phase 2: Enrich with store page details
      const allTitles = [...libraryTitles, ...wishlistTitles];
      const totalTitles = allTitles.length;
      let enrichedCount = 0;

      OverlayUI.setScraping({
        phase: `Fetching detailed metadata for ${totalTitles} titles...`,
        progress: 50,
        scrapedCount: 0,
        totalCount: totalTitles,
      });

      const enrichmentResult = await StoreScraper.scrapeStorePages(
        allTitles,
        rateLimiter,
        retryHandler,
        (current, total, enrichedTitle) => {
          enrichedCount = current;
          const progress = 50 + (current / total) * 50; // 50-100% for store pages

          OverlayUI.setScraping({
            phase: `Enriching metadata: ${current} of ${total} titles...`,
            progress,
            scrapedCount: current,
            totalCount: total,
          });
        }
      );

      extensionState.scrapedTitles = enrichmentResult.titles;
      extensionState.warnings = enrichmentResult.warnings;

      console.log(
        `[AudibleExtension] Store scraping complete: ${enrichmentResult.titles.length} titles enriched`
      );

      // Phase 3: Normalize to JSON format
      OverlayUI.setScraping({
        phase: 'Normalizing data...',
        progress: 100,
        scrapedCount: enrichmentResult.titles.length,
        totalCount: enrichmentResult.titles.length,
      });

      const normalizedData = JSONNormalizer.normalize({
        titles: extensionState.scrapedTitles,
        startTime: extensionState.startTime,
        warnings: extensionState.warnings,
        userId: null, // Not available from scraping
      });

      // Validate normalized data
      const validation = JSONNormalizer.validatePayload(normalizedData);
      if (!validation.valid) {
        console.error(
          '[AudibleExtension] Validation errors:',
          validation.errors
        );
        extensionState.warnings.push(...validation.errors);
      }

      if (validation.warnings.length > 0) {
        console.warn(
          '[AudibleExtension] Validation warnings:',
          validation.warnings
        );
        extensionState.warnings.push(...validation.warnings);
      }

      // Save normalized data
      await StorageManager.saveScrapedData(normalizedData);

      // Complete!
      OverlayUI.setComplete({
        libraryCount: normalizedData.summary.libraryCount,
        wishlistCount: normalizedData.summary.wishlistCount,
        duration: normalizedData.summary.scrapeDurationMs,
        warnings: extensionState.warnings.slice(0, 5), // Show first 5 warnings
      });

      extensionState.scraping = false;

      console.log('[AudibleExtension] Sync complete!');
    } catch (error) {
      console.error('[AudibleExtension] Sync failed:', error);
      OverlayUI.setError(`Sync failed: ${error.message}`);
      extensionState.scraping = false;
    }
  }

  /**
   * Handle Pause Sync
   */
  async function handlePauseSync() {
    console.log('[AudibleExtension] Pausing sync...');
    extensionState.paused = true;
    await saveProgress();
  }

  /**
   * Handle Download JSON button click
   */
  async function handleDownload() {
    console.log('[AudibleExtension] Downloading JSON...');

    try {
      // Load scraped data from storage
      const scrapedData = await StorageManager.loadScrapedData();

      if (!scrapedData || !scrapedData.titleCatalog) {
        OverlayUI.setError('No data available to download');
        return;
      }

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `audible-library-${date}.json`;

      // Create blob and download
      const blob = new Blob([JSON.stringify(scrapedData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();

      URL.revokeObjectURL(url);

      console.log('[AudibleExtension] JSON downloaded:', filename);
    } catch (error) {
      console.error('[AudibleExtension] Download failed:', error);
      OverlayUI.setError('Failed to download JSON: ' + error.message);
    }
  }

  /**
   * Handle settings change
   */
  async function handleSettingsChange(settings) {
    console.log('[AudibleExtension] Settings changed:', settings);

    try {
      // Merge with existing settings
      const currentSettings = await StorageManager.loadSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      await StorageManager.saveSettings(updatedSettings);

      // Update UI state
      OverlayUI.setState({ settings: updatedSettings });

      // Update rate limiter
      if (settings.rateLimit) {
        rateLimiter.setRate(settings.rateLimit);
      }
    } catch (error) {
      console.error('[AudibleExtension] Failed to save settings:', error);
    }
  }

  /**
   * Save progress to storage
   */
  async function saveProgress() {
    try {
      await StorageManager.saveProgress({
        sessionId: extensionState.sessionId,
        status: extensionState.scraping ? 'in_progress' : 'paused',
        startTime: extensionState.startTime,
        totalTitles: extensionState.scrapedTitles.length,
        scrapedCount: extensionState.scrapedTitles.length,
        scrapedTitles: extensionState.scrapedTitles,
        errors: extensionState.warnings,
      });
    } catch (error) {
      console.error('[AudibleExtension] Failed to save progress:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
})();
