/**
 * Content Script - Main entry point
 *
 * Injected on audible.com/library* (includes /library/wishlist)
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
  const rateLimiter = new RateLimiter(); // Fixed 10 req/sec
  const retryHandler = new RetryHandler(3, 1000);

  // Initialize overlay UI
  await OverlayUI.init({
    onStartSync: handleStartSync,
    onPauseSync: handlePauseSync,
    onDownload: handleDownload,
    onRetry: handleRetry,
    onCancel: handleCancel,
  });

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
      // Phase 1: Scrape library pages for basic metadata
      OverlayUI.setScraping({
        phase: 'Detecting pagination...',
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
            progress: (currentPage / totalPages) * 70, // 0-70% for library pages
            scrapedCount: extensionState.scrapedTitles.length,
            totalCount: LibraryScraper.getTotalCount(),
          });
        },
        async (pageNumber, pageTitles) => {
          // Save progress after each page
          extensionState.scrapedTitles.push(...pageTitles);
          await saveProgress();
        }
      );

      console.log(
        `[AudibleExtension] Library scraping complete: ${libraryTitles.length} titles`
      );

      // Phase 1.5: Scrape wishlist
      let wishlistTitles = [];
      try {
        OverlayUI.setScraping({
          phase: 'Fetching wishlist...',
          progress: 70,
          scrapedCount: 0,
          totalCount: 0,
        });

        // Fetch wishlist page
        const wishlistUrl = 'https://www.audible.com/library/wishlist';
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
                  progress: 70 + (currentPage / totalPages) * 30, // 70-100% for wishlist pages
                  scrapedCount: wishlistTitles.length,
                  totalCount: WishlistScraper.getTotalCount(),
                });
              },
              async (pageNumber, pageTitles) => {
                // Save progress after each page
                await saveProgress();
              }
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

      // Combine library and wishlist titles (no store page enrichment needed)
      const allTitles = [...libraryTitles, ...wishlistTitles];
      extensionState.scrapedTitles = allTitles;

      console.log(
        `[AudibleExtension] Scraping complete: ${allTitles.length} titles (${libraryTitles.length} library, ${wishlistTitles.length} wishlist)`
      );

      // Normalize to JSON format
      OverlayUI.setScraping({
        phase: 'Normalizing data...',
        progress: 100,
        scrapedCount: allTitles.length,
        totalCount: allTitles.length,
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
   * Handle Retry button click (after error)
   */
  async function handleRetry() {
    console.log('[AudibleExtension] Retrying sync...');

    // Reset error state
    OverlayUI.reset();

    // Restart the sync process
    await handleStartSync();
  }

  /**
   * Handle Cancel button click (after error)
   */
  function handleCancel() {
    console.log('[AudibleExtension] Cancelling sync...');

    // Reset to idle state
    extensionState.scraping = false;
    extensionState.paused = false;
    extensionState.scrapedTitles = [];
    extensionState.warnings = [];

    OverlayUI.reset();
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
