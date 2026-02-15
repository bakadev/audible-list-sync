/**
 * Overlay UI - Vanilla JavaScript overlay component
 *
 * Creates a collapsible overlay panel with:
 * - Start Sync button
 * - Progress tracking
 * - Download JSON button
 * - Settings panel
 * - Error messages
 *
 * No dependencies - pure vanilla JS with shadow DOM for style isolation
 */

const OverlayUI = {
  shadowRoot: null,
  container: null,
  elements: {},
  state: {
    visible: true,
    collapsed: false,
    status: 'idle', // idle, scraping, complete, error, auto-sync-success, auto-sync-error
    phase: '',
    progress: 0,
    scrapedCount: 0,
    totalCount: 0,
    errorMessage: null,
    errorTitle: null,
    errorAction: null,
    warnings: [],
    stats: {
      libraryCount: 0,
      wishlistCount: 0,
      duration: 0,
      imported: 0,
      newToCatalog: 0,
    },
  },
  callbacks: {
    onStartSync: null,
    onPauseSync: null,
    onDownload: null,
    onRetry: null,
    onCancel: null,
  },

  /**
   * Initialize overlay UI
   * @param {Object} callbacks - Event callbacks
   */
  async init(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };

    // Create shadow host
    const host = document.createElement('div');
    host.id = 'audible-ext-overlay-host';
    document.body.appendChild(host);

    // Create shadow root for style isolation
    this.shadowRoot = host.attachShadow({ mode: 'open' });

    // Load styles
    await this.loadStyles();

    // Create overlay HTML
    this.createOverlay();

    // Attach event listeners
    this.attachEventListeners();

    console.log('[OverlayUI] Initialized');
  },

  /**
   * Load CSS into shadow DOM
   */
  async loadStyles() {
    try {
      const cssUrl = chrome.runtime.getURL('styles/overlay.css');
      const response = await fetch(cssUrl);
      const cssText = await response.text();

      const style = document.createElement('style');
      style.textContent = cssText;
      this.shadowRoot.appendChild(style);
    } catch (error) {
      console.error('[OverlayUI] Failed to load styles:', error);
    }
  },

  /**
   * Create overlay HTML structure
   */
  createOverlay() {
    const container = document.createElement('div');
    container.className = 'audible-ext-overlay';

    container.innerHTML = `
      <div class="audible-ext-panel">
        <div class="audible-ext-header">
          <h3>Audible Library Sync</h3>
          <button class="audible-ext-toggle" aria-label="Toggle panel">▼</button>
        </div>
        <div class="audible-ext-body">
          <!-- Status message -->
          <div class="audible-ext-status" style="display: none;"></div>

          <!-- Progress section -->
          <div class="audible-ext-progress" style="display: none;">
            <div class="audible-ext-progress-label">
              <span class="progress-text">0 of 0 titles</span>
              <span class="progress-percent">0%</span>
            </div>
            <div class="audible-ext-progress-bar">
              <div class="audible-ext-progress-fill" style="width: 0%"></div>
            </div>
          </div>

          <!-- Statistics -->
          <div class="audible-ext-stats" style="display: none;">
            <div class="audible-ext-stat">
              <span class="audible-ext-stat-value library-count">0</span>
              <span class="audible-ext-stat-label">Library</span>
            </div>
            <div class="audible-ext-stat">
              <span class="audible-ext-stat-value wishlist-count">0</span>
              <span class="audible-ext-stat-label">Wishlist</span>
            </div>
          </div>

          <!-- Buttons -->
          <button class="audible-ext-button audible-ext-button-primary start-button">Start Sync</button>
          <button class="audible-ext-button audible-ext-button-success download-button" style="display: none;">Download JSON</button>
          <button class="audible-ext-button audible-ext-button-success view-library-button" style="display: none;">View Library</button>

          <!-- Error Recovery Buttons -->
          <div class="audible-ext-error-actions" style="display: none;">
            <button class="audible-ext-button audible-ext-button-primary retry-button">Retry</button>
            <button class="audible-ext-button audible-ext-button-secondary cancel-button">Cancel</button>
          </div>

          <!-- Auto-Sync Error Actions -->
          <div class="audible-ext-sync-error-actions" style="display: none;">
            <button class="audible-ext-button audible-ext-button-primary return-to-app-button" style="display: none;">Return to audioshlf</button>
            <button class="audible-ext-button audible-ext-button-primary sync-retry-button" style="display: none;">Retry Sync</button>
            <button class="audible-ext-button audible-ext-button-secondary sync-download-button" style="display: none;">Download JSON</button>
          </div>

          <!-- Warnings -->
          <div class="audible-ext-warnings" style="display: none;">
            <strong>Warnings:</strong>
            <div class="warnings-list"></div>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(container);
    this.container = container;

    // Cache element references
    this.elements = {
      header: container.querySelector('.audible-ext-header'),
      body: container.querySelector('.audible-ext-body'),
      toggle: container.querySelector('.audible-ext-toggle'),
      status: container.querySelector('.audible-ext-status'),
      progress: container.querySelector('.audible-ext-progress'),
      progressText: container.querySelector('.progress-text'),
      progressPercent: container.querySelector('.progress-percent'),
      progressFill: container.querySelector('.audible-ext-progress-fill'),
      stats: container.querySelector('.audible-ext-stats'),
      libraryCount: container.querySelector('.library-count'),
      wishlistCount: container.querySelector('.wishlist-count'),
      startButton: container.querySelector('.start-button'),
      downloadButton: container.querySelector('.download-button'),
      viewLibraryButton: container.querySelector('.view-library-button'),
      errorActions: container.querySelector('.audible-ext-error-actions'),
      retryButton: container.querySelector('.retry-button'),
      cancelButton: container.querySelector('.cancel-button'),
      syncErrorActions: container.querySelector('.audible-ext-sync-error-actions'),
      returnToAppButton: container.querySelector('.return-to-app-button'),
      syncRetryButton: container.querySelector('.sync-retry-button'),
      syncDownloadButton: container.querySelector('.sync-download-button'),
      warnings: container.querySelector('.audible-ext-warnings'),
      warningsList: container.querySelector('.warnings-list'),
    };
  },

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Header click to collapse/expand
    this.elements.header.addEventListener('click', () => {
      this.toggleCollapse();
    });

    // Start Sync button
    this.elements.startButton.addEventListener('click', () => {
      if (this.callbacks.onStartSync) {
        this.callbacks.onStartSync();
      }
    });

    // Download JSON button
    this.elements.downloadButton.addEventListener('click', () => {
      if (this.callbacks.onDownload) {
        this.callbacks.onDownload();
      }
    });

    // View Library button
    this.elements.viewLibraryButton.addEventListener('click', () => {
      const appUrl = window.EXTENSION_CONFIG?.APP_URL || 'https://audioshlf.app';
      window.open(`${appUrl}/library`, '_blank');
    });

    // Retry button
    this.elements.retryButton.addEventListener('click', () => {
      if (this.callbacks.onRetry) {
        this.callbacks.onRetry();
      }
    });

    // Cancel button
    this.elements.cancelButton.addEventListener('click', () => {
      if (this.callbacks.onCancel) {
        this.callbacks.onCancel();
      }
    });

    // Auto-sync error action buttons
    this.elements.returnToAppButton.addEventListener('click', () => {
      const appUrl = window.EXTENSION_CONFIG?.APP_URL || 'https://audioshlf.app';
      window.open(`${appUrl}/library`, '_blank');
    });

    this.elements.syncRetryButton.addEventListener('click', () => {
      if (this.callbacks.onRetry) {
        this.callbacks.onRetry();
      }
    });

    this.elements.syncDownloadButton.addEventListener('click', () => {
      if (this.callbacks.onDownload) {
        this.callbacks.onDownload();
      }
    });
  },

  /**
   * Toggle collapse state
   */
  toggleCollapse() {
    this.state.collapsed = !this.state.collapsed;

    if (this.state.collapsed) {
      this.elements.body.style.display = 'none';
      this.elements.toggle.textContent = '▲';
    } else {
      this.elements.body.style.display = 'block';
      this.elements.toggle.textContent = '▼';
    }
  },

  /**
   * Update UI state
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  },

  /**
   * Set scraping state
   */
  setScraping(data) {
    this.state.status = 'scraping';
    this.state.phase = data.phase || 'Scraping...';
    this.state.progress = data.progress || 0;
    this.state.scrapedCount = data.scrapedCount || 0;
    this.state.totalCount = data.totalCount || 0;
    this.state.errorMessage = null;
    this.render();
  },

  /**
   * Set complete state
   */
  setComplete(stats) {
    this.state.status = 'complete';
    this.state.phase = 'Sync complete!';
    this.state.progress = 100;
    this.state.stats = {
      libraryCount: stats.libraryCount || 0,
      wishlistCount: stats.wishlistCount || 0,
      duration: stats.duration || 0,
    };
    this.state.warnings = stats.warnings || [];
    this.state.errorMessage = null;
    this.render();
  },

  /**
   * Set error state
   */
  setError(errorMessage) {
    this.state.status = 'error';
    this.state.phase = 'Error';
    this.state.errorMessage = errorMessage;
    this.render();
  },

  /**
   * Set auto-sync success state
   */
  setAutoSyncSuccess(stats) {
    this.state.status = 'auto-sync-success';
    this.state.phase = 'Library synced successfully!';
    this.state.progress = 100;
    this.state.stats = {
      libraryCount: stats.libraryCount || 0,
      wishlistCount: stats.wishlistCount || 0,
      imported: stats.imported || 0,
      newToCatalog: stats.newToCatalog || 0,
    };
    this.state.warnings = stats.warnings || [];
    this.state.errorMessage = null;
    this.state.errorTitle = null;
    this.state.errorAction = null;
    this.render();
  },

  /**
   * Set auto-sync error state
   */
  setAutoSyncError(errorInfo) {
    this.state.status = 'auto-sync-error';
    this.state.phase = errorInfo.title || 'Sync Failed';
    this.state.errorMessage = errorInfo.message || 'An error occurred during sync.';
    this.state.errorTitle = errorInfo.title || 'Sync Failed';
    this.state.errorAction = errorInfo.action || 'download';
    this.state.errorDetails = errorInfo.details || null;
    this.render();
  },

  /**
   * Reset to idle state
   */
  reset() {
    this.state.status = 'idle';
    this.state.phase = '';
    this.state.progress = 0;
    this.state.scrapedCount = 0;
    this.state.totalCount = 0;
    this.state.errorMessage = null;
    this.state.errorTitle = null;
    this.state.errorAction = null;
    this.state.warnings = [];
    this.render();
  },

  /**
   * Render UI based on current state
   */
  render() {
    const { status, phase, progress, scrapedCount, totalCount, errorMessage, errorAction, stats, warnings } = this.state;

    // Status message
    if (phase) {
      this.elements.status.textContent = phase;
      this.elements.status.style.display = 'block';
      this.elements.status.className = 'audible-ext-status';
      if (status === 'error' || status === 'auto-sync-error') {
        this.elements.status.classList.add('error');
      } else if (status === 'complete' || status === 'auto-sync-success') {
        this.elements.status.classList.add('success');
      }
    } else {
      this.elements.status.style.display = 'none';
    }

    // Error message (show additional message for auto-sync errors)
    if (errorMessage && status === 'auto-sync-error') {
      // Create two-line display: title (phase) + message
      this.elements.status.innerHTML = `<strong>${phase}</strong><br/>${errorMessage}`;
      this.elements.status.className = 'audible-ext-status error';
      this.elements.status.style.display = 'block';
    } else if (errorMessage) {
      this.elements.status.textContent = errorMessage;
      this.elements.status.className = 'audible-ext-status error';
      this.elements.status.style.display = 'block';
    }

    // Progress bar
    if (status === 'scraping') {
      this.elements.progress.style.display = 'block';
      this.elements.progressText.textContent = `${scrapedCount} of ${totalCount} titles`;
      this.elements.progressPercent.textContent = `${Math.round(progress)}%`;
      this.elements.progressFill.style.width = `${progress}%`;
    } else {
      this.elements.progress.style.display = 'none';
    }

    // Stats
    if (status === 'complete' || status === 'auto-sync-success') {
      this.elements.stats.style.display = 'grid';

      if (status === 'auto-sync-success') {
        // Show sync-specific stats (imported, new to catalog)
        this.elements.libraryCount.textContent = stats.imported || 0;
        this.elements.libraryCount.parentElement.querySelector('.audible-ext-stat-label').textContent = 'Imported';
        this.elements.wishlistCount.textContent = stats.newToCatalog || 0;
        this.elements.wishlistCount.parentElement.querySelector('.audible-ext-stat-label').textContent = 'New';
      } else {
        // Show normal completion stats (library/wishlist counts)
        this.elements.libraryCount.textContent = stats.libraryCount;
        this.elements.libraryCount.parentElement.querySelector('.audible-ext-stat-label').textContent = 'Library';
        this.elements.wishlistCount.textContent = stats.wishlistCount;
        this.elements.wishlistCount.parentElement.querySelector('.audible-ext-stat-label').textContent = 'Wishlist';
      }
    } else {
      this.elements.stats.style.display = 'none';
    }

    // Buttons
    if (status === 'idle') {
      this.elements.startButton.style.display = 'block';
      this.elements.downloadButton.style.display = 'none';
      this.elements.viewLibraryButton.style.display = 'none';
      this.elements.errorActions.style.display = 'none';
      this.elements.syncErrorActions.style.display = 'none';
    } else if (status === 'error') {
      this.elements.startButton.style.display = 'none';
      this.elements.downloadButton.style.display = 'none';
      this.elements.viewLibraryButton.style.display = 'none';
      this.elements.errorActions.style.display = 'flex';
      this.elements.syncErrorActions.style.display = 'none';
    } else if (status === 'complete') {
      this.elements.startButton.style.display = 'none';
      this.elements.downloadButton.style.display = 'block';
      this.elements.viewLibraryButton.style.display = 'none';
      this.elements.errorActions.style.display = 'none';
      this.elements.syncErrorActions.style.display = 'none';
    } else if (status === 'auto-sync-success') {
      this.elements.startButton.style.display = 'none';
      this.elements.downloadButton.style.display = 'none';
      this.elements.viewLibraryButton.style.display = 'block';
      this.elements.errorActions.style.display = 'none';
      this.elements.syncErrorActions.style.display = 'none';
    } else if (status === 'auto-sync-error') {
      this.elements.startButton.style.display = 'none';
      this.elements.downloadButton.style.display = 'none';
      this.elements.viewLibraryButton.style.display = 'none';
      this.elements.errorActions.style.display = 'none';
      this.elements.syncErrorActions.style.display = 'flex';

      // Show appropriate action buttons based on error type
      if (errorAction === 'return_to_app') {
        this.elements.returnToAppButton.style.display = 'block';
        this.elements.syncRetryButton.style.display = 'none';
        this.elements.syncDownloadButton.style.display = 'none';
      } else if (errorAction === 'retry') {
        this.elements.returnToAppButton.style.display = 'none';
        this.elements.syncRetryButton.style.display = 'block';
        this.elements.syncDownloadButton.style.display = 'none';
      } else if (errorAction === 'download') {
        this.elements.returnToAppButton.style.display = 'none';
        this.elements.syncRetryButton.style.display = 'none';
        this.elements.syncDownloadButton.style.display = 'block';
      } else {
        // Default: show download as fallback
        this.elements.returnToAppButton.style.display = 'none';
        this.elements.syncRetryButton.style.display = 'none';
        this.elements.syncDownloadButton.style.display = 'block';
      }
    } else if (status === 'scraping') {
      this.elements.startButton.style.display = 'none';
      this.elements.downloadButton.style.display = 'none';
      this.elements.viewLibraryButton.style.display = 'none';
      this.elements.errorActions.style.display = 'none';
      this.elements.syncErrorActions.style.display = 'none';
    }

    // Warnings
    if (warnings.length > 0) {
      this.elements.warnings.style.display = 'block';
      this.elements.warningsList.innerHTML = warnings
        .map((w) => `<div class="audible-ext-warning-item">${w}</div>`)
        .join('');
    } else {
      this.elements.warnings.style.display = 'none';
    }
  },

  /**
   * Show/hide overlay
   */
  setVisible(visible) {
    this.state.visible = visible;
    if (this.shadowRoot && this.shadowRoot.host) {
      this.shadowRoot.host.style.display = visible ? 'block' : 'none';
    }
  },

  /**
   * Destroy overlay
   */
  destroy() {
    if (this.shadowRoot && this.shadowRoot.host) {
      this.shadowRoot.host.remove();
    }
    console.log('[OverlayUI] Destroyed');
  },
};

// Export for browser (no window prefix needed in content script context)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OverlayUI;
}
