/**
 * Storage Manager - chrome.storage.local wrapper
 *
 * Provides methods for saving/loading:
 * - Scraping progress (for pause/resume)
 * - Sync sessions
 * - JWT token storage
 */

const StorageManager = {
  /**
   * Storage keys used by the extension
   */
  KEYS: {
    CURRENT_SESSION: 'current_session',
    SESSION_HISTORY: 'session_history',
    SYNC_TOKEN: 'sync_token',
    SCRAPED_DATA: 'scraped_data',
  },

  /**
   * Save scraping progress for current session
   * @param {Object} progress - Progress data
   * @param {string} progress.sessionId - Unique session identifier
   * @param {string} progress.status - Session status (in_progress, paused, completed, failed)
   * @param {number} progress.startTime - Start timestamp
   * @param {number} progress.lastUpdate - Last update timestamp
   * @param {number} progress.totalTitles - Total titles to scrape
   * @param {number} progress.scrapedCount - Number of titles scraped so far
   * @param {Array} progress.scrapedTitles - Array of scraped title objects
   * @param {Array} progress.errors - Array of error messages
   * @param {Object} progress.pagination - Library pagination state
   * @returns {Promise<void>}
   */
  async saveProgress(progress) {
    try {
      await chrome.storage.local.set({
        [this.KEYS.CURRENT_SESSION]: {
          ...progress,
          lastUpdate: Date.now(),
        },
      });
    } catch (error) {
      console.error('[StorageManager] Failed to save progress:', error);
      throw error;
    }
  },

  /**
   * Load current scraping session progress
   * @returns {Promise<Object|null>} Progress data or null if no session exists
   */
  async loadProgress() {
    try {
      const result = await chrome.storage.local.get(this.KEYS.CURRENT_SESSION);
      return result[this.KEYS.CURRENT_SESSION] || null;
    } catch (error) {
      console.error('[StorageManager] Failed to load progress:', error);
      return null;
    }
  },

  /**
   * Clear current session progress
   * @returns {Promise<void>}
   */
  async clearProgress() {
    try {
      await chrome.storage.local.remove(this.KEYS.CURRENT_SESSION);
    } catch (error) {
      console.error('[StorageManager] Failed to clear progress:', error);
      throw error;
    }
  },

  /**
   * Save scraped title data incrementally
   * @param {Array} titles - Array of title objects
   * @returns {Promise<void>}
   */
  async saveScrapedData(titles) {
    try {
      await chrome.storage.local.set({
        [this.KEYS.SCRAPED_DATA]: titles,
      });
    } catch (error) {
      console.error('[StorageManager] Failed to save scraped data:', error);
      throw error;
    }
  },

  /**
   * Load scraped title data
   * @returns {Promise<Array>} Array of scraped titles
   */
  async loadScrapedData() {
    try {
      const result = await chrome.storage.local.get(this.KEYS.SCRAPED_DATA);
      return result[this.KEYS.SCRAPED_DATA] || [];
    } catch (error) {
      console.error('[StorageManager] Failed to load scraped data:', error);
      return [];
    }
  },

  /**
   * Save sync token (JWT from website)
   * @param {Object} tokenData - Token data
   * @param {string} tokenData.token - JWT token string
   * @param {number} tokenData.expiresAt - Expiry timestamp (15 min from generation)
   * @returns {Promise<void>}
   */
  async saveToken(tokenData) {
    try {
      await chrome.storage.local.set({
        [this.KEYS.SYNC_TOKEN]: {
          token: tokenData.token,
          expiresAt: tokenData.expiresAt,
          savedAt: Date.now(),
        },
      });
    } catch (error) {
      console.error('[StorageManager] Failed to save token:', error);
      throw error;
    }
  },

  /**
   * Load sync token
   * @returns {Promise<Object|null>} Token data or null if no token exists or expired
   */
  async loadToken() {
    try {
      const result = await chrome.storage.local.get(this.KEYS.SYNC_TOKEN);
      const tokenData = result[this.KEYS.SYNC_TOKEN];

      if (!tokenData) {
        return null;
      }

      // Check if token is expired
      if (Date.now() > tokenData.expiresAt) {
        await this.clearToken();
        return null;
      }

      return tokenData;
    } catch (error) {
      console.error('[StorageManager] Failed to load token:', error);
      return null;
    }
  },

  /**
   * Clear sync token
   * @returns {Promise<void>}
   */
  async clearToken() {
    try {
      await chrome.storage.local.remove(this.KEYS.SYNC_TOKEN);
    } catch (error) {
      console.error('[StorageManager] Failed to clear token:', error);
      throw error;
    }
  },

  /**
   * Archive completed session to history
   * @param {Object} session - Completed session data
   * @returns {Promise<void>}
   */
  async archiveSession(session) {
    try {
      const history = await this.getSessionHistory();
      history.unshift({
        ...session,
        archivedAt: Date.now(),
      });

      // Keep only last 10 sessions
      const trimmedHistory = history.slice(0, 10);

      await chrome.storage.local.set({
        [this.KEYS.SESSION_HISTORY]: trimmedHistory,
      });

      // Clear current session
      await this.clearProgress();
    } catch (error) {
      console.error('[StorageManager] Failed to archive session:', error);
      throw error;
    }
  },

  /**
   * Get session history
   * @returns {Promise<Array>} Array of past session objects
   */
  async getSessionHistory() {
    try {
      const result = await chrome.storage.local.get(this.KEYS.SESSION_HISTORY);
      return result[this.KEYS.SESSION_HISTORY] || [];
    } catch (error) {
      console.error('[StorageManager] Failed to get session history:', error);
      return [];
    }
  },

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Storage usage info
   */
  async getStorageInfo() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const QUOTA_BYTES = 10 * 1024 * 1024; // 10MB quota for chrome.storage.local

      return {
        bytesInUse,
        bytesAvailable: QUOTA_BYTES - bytesInUse,
        percentUsed: (bytesInUse / QUOTA_BYTES) * 100,
        quotaBytes: QUOTA_BYTES,
      };
    } catch (error) {
      console.error('[StorageManager] Failed to get storage info:', error);
      return null;
    }
  },

  /**
   * Clear all extension data (reset to defaults)
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await chrome.storage.local.clear();
      console.log('[StorageManager] All data cleared');
    } catch (error) {
      console.error('[StorageManager] Failed to clear all data:', error);
      throw error;
    }
  },
};

// Export for browser (window) and Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
