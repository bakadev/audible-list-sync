/**
 * Production Configuration
 *
 * Copy this file to config.js when deploying to production
 */

const CONFIG = {
  // API endpoint for syncing library data
  API_URL: 'https://audioshlf.app/api/sync/import',

  // Base URL for navigation (library page)
  APP_URL: 'https://audioshlf.app',
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.EXTENSION_CONFIG = CONFIG;
}
