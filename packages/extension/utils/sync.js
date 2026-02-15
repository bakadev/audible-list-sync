/**
 * Sync Utility Module
 *
 * Handles token detection and auto-POST to audioshlf API
 * - Detect sync token from URL fragment
 * - Automatically POST library data to sync API
 * - Handle errors and provide user feedback
 */

/**
 * Detect sync token from URL fragment
 * Token is placed in URL as #token=eyJ...
 *
 * @returns {string|null} Sync token if present, null otherwise
 */
function detectSyncToken() {
  try {
    // Check URL fragment (hash)
    const hash = window.location.hash;

    if (!hash) {
      console.log('[Sync] No URL fragment found');
      return null;
    }

    // Parse fragment as query string (remove leading #)
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('token');

    if (token) {
      console.log('[Sync] Sync token detected in URL fragment');
      return token;
    }

    // Also check regular query string as fallback
    const searchParams = new URLSearchParams(window.location.search);
    const queryToken = searchParams.get('syncToken') || searchParams.get('token');

    if (queryToken) {
      console.log('[Sync] Sync token detected in query string');
      return queryToken;
    }

    console.log('[Sync] No sync token found in URL');
    return null;
  } catch (error) {
    console.error('[Sync] Error detecting token:', error);
    return null;
  }
}

/**
 * Automatically POST library data to audioshlf API
 *
 * @param {string} token - Sync token from URL
 * @param {Array} libraryData - Array of title objects to sync
 * @param {Object} options - Optional configuration
 * @param {string} options.apiUrl - API endpoint URL (default: production URL)
 * @param {function} options.onProgress - Progress callback (optional)
 * @returns {Promise<Object>} API response with import stats
 * @throws {Error} If POST fails or token is invalid
 */
async function autoSync(token, libraryData, options = {}) {
  const {
    apiUrl = window.EXTENSION_CONFIG?.API_URL || 'https://audioshlf.app/api/sync/import',
    onProgress = null
  } = options;

  console.log(`[Sync] Starting auto-sync with ${libraryData.length} titles`);

  if (!token) {
    throw new Error('No sync token provided');
  }

  if (!Array.isArray(libraryData) || libraryData.length === 0) {
    throw new Error('No library data to sync');
  }

  try {
    // Notify progress
    if (onProgress) {
      onProgress({ status: 'uploading', message: 'Syncing to audioshlf...' });
    }

    // POST to API with token in Authorization header
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        titles: libraryData
      })
    });

    // Parse response
    const data = await response.json();

    // Check for HTTP errors
    if (!response.ok) {
      const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;

      // Handle specific error cases
      if (response.status === 401) {
        if (errorMessage.includes('expired')) {
          throw new Error('SYNC_TOKEN_EXPIRED: ' + errorMessage);
        } else if (errorMessage.includes('already used')) {
          throw new Error('SYNC_TOKEN_USED: ' + errorMessage);
        } else {
          throw new Error('SYNC_AUTH_ERROR: ' + errorMessage);
        }
      } else if (response.status === 400) {
        throw new Error('SYNC_VALIDATION_ERROR: ' + errorMessage);
      } else if (response.status === 413) {
        throw new Error('SYNC_PAYLOAD_TOO_LARGE: ' + errorMessage);
      } else if (response.status >= 500) {
        throw new Error('SYNC_SERVER_ERROR: ' + errorMessage);
      } else {
        throw new Error('SYNC_ERROR: ' + errorMessage);
      }
    }

    // Notify success
    if (onProgress) {
      onProgress({
        status: 'success',
        message: `Successfully synced ${data.imported} titles!`
      });
    }

    console.log('[Sync] Auto-sync completed successfully', data);

    return data;
  } catch (error) {
    // Network error (fetch failed)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('SYNC_NETWORK_ERROR: Failed to connect to audioshlf. Check your internet connection.');
      networkError.originalError = error;
      throw networkError;
    }

    // Re-throw custom errors
    if (error.message.startsWith('SYNC_')) {
      throw error;
    }

    // Wrap unknown errors
    const wrappedError = new Error('SYNC_UNKNOWN_ERROR: ' + error.message);
    wrappedError.originalError = error;
    throw wrappedError;
  }
}

/**
 * Get user-friendly error message from sync error
 *
 * @param {Error} error - Error from autoSync
 * @returns {Object} Object with title and message for user display
 */
function getErrorMessage(error) {
  const errorMsg = error.message || '';

  if (errorMsg.includes('SYNC_TOKEN_EXPIRED')) {
    return {
      title: 'Sync Token Expired',
      message: 'Your sync token has expired. Please return to audioshlf and generate a new token by clicking "Update Library".',
      action: 'return_to_app'
    };
  }

  if (errorMsg.includes('SYNC_TOKEN_USED')) {
    return {
      title: 'Token Already Used',
      message: 'This sync token has already been used. Each token can only be used once. Please return to audioshlf to generate a new token.',
      action: 'return_to_app'
    };
  }

  if (errorMsg.includes('SYNC_AUTH_ERROR')) {
    return {
      title: 'Authentication Error',
      message: 'Failed to authenticate with audioshlf. The token may be invalid. Please try generating a new sync token.',
      action: 'return_to_app'
    };
  }

  if (errorMsg.includes('SYNC_NETWORK_ERROR')) {
    return {
      title: 'Connection Failed',
      message: 'Failed to connect to audioshlf. Please check your internet connection and try again.',
      action: 'retry'
    };
  }

  if (errorMsg.includes('SYNC_VALIDATION_ERROR')) {
    return {
      title: 'Invalid Data',
      message: 'The library data could not be synced. Please try downloading the JSON file instead and uploading manually.',
      action: 'download'
    };
  }

  if (errorMsg.includes('SYNC_PAYLOAD_TOO_LARGE')) {
    return {
      title: 'Library Too Large',
      message: 'Your library is too large to sync automatically. Please download the JSON file and upload it manually on the website.',
      action: 'download'
    };
  }

  if (errorMsg.includes('SYNC_SERVER_ERROR')) {
    return {
      title: 'Server Error',
      message: 'audioshlf is experiencing issues. Please try again later or download the JSON file for manual upload.',
      action: 'retry'
    };
  }

  // Generic error
  return {
    title: 'Sync Failed',
    message: 'An unexpected error occurred during sync. Please try downloading the JSON file and uploading manually.',
    action: 'download',
    details: errorMsg
  };
}

// Export functions for use in content script
if (typeof window !== 'undefined') {
  window.SyncUtils = {
    detectSyncToken,
    autoSync,
    getErrorMessage
  };
}
