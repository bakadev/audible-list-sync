/**
 * Retry Handler - Exponential backoff retry logic
 *
 * Retries failed requests with exponential backoff:
 * - 1st retry: 1 second delay
 * - 2nd retry: 2 seconds delay
 * - 3rd retry: 4 seconds delay
 * - Then fails
 */

class RetryHandler {
  constructor(maxRetries = 3, baseDelayMs = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.retryCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
  }

  /**
   * Execute a function with retry logic
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Retry options
   * @param {number} options.maxRetries - Override max retries
   * @param {Function} options.shouldRetry - Function to determine if error is retryable
   * @param {Function} options.onRetry - Callback called before each retry
   * @param {string} options.context - Context string for logging
   * @returns {Promise} Result of function execution
   */
  async execute(fn, options = {}) {
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const shouldRetry = options.shouldRetry ?? this.defaultShouldRetry;
    const onRetry = options.onRetry ?? (() => {});
    const context = options.context ?? 'Request';

    let lastError;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await fn();
        this.successCount++;

        if (attempt > 0) {
          console.log(`[RetryHandler] ${context} succeeded after ${attempt} retries`);
        }

        return result;
      } catch (error) {
        lastError = error;
        this.retryCount++;

        // Check if we should retry this error
        if (!shouldRetry(error)) {
          console.error(`[RetryHandler] ${context} failed with non-retryable error:`, error);
          this.failureCount++;
          throw error;
        }

        // Check if we've exhausted retries
        if (attempt >= maxRetries) {
          console.error(
            `[RetryHandler] ${context} failed after ${maxRetries} retries:`,
            error
          );
          this.failureCount++;
          throw new Error(
            `Failed after ${maxRetries} retries: ${error.message || error}`
          );
        }

        // Calculate delay with exponential backoff
        const delayMs = this.calculateDelay(attempt);

        console.warn(
          `[RetryHandler] ${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`,
          error.message || error
        );

        // Call retry callback
        await onRetry(attempt, delayMs, error);

        // Wait before retry
        await this.sleep(delayMs);

        attempt++;
      }
    }

    // Should never reach here, but just in case
    throw lastError;
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    // Exponential backoff: baseDelay * 2^attempt
    // Attempt 0: 1000ms
    // Attempt 1: 2000ms
    // Attempt 2: 4000ms
    return this.baseDelayMs * Math.pow(2, attempt);
  }

  /**
   * Default function to determine if error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} True if error is retryable
   */
  defaultShouldRetry(error) {
    // Retryable HTTP status codes
    const retryableCodes = [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];

    // Check if error has status code
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      return retryableCodes.includes(status);
    }

    // Check if error message indicates network issue
    if (error.message) {
      const networkErrors = ['network error', 'timeout', 'econnreset', 'enotfound'];
      const message = error.message.toLowerCase();
      return networkErrors.some((keyword) => message.includes(keyword));
    }

    // Default: retry unknown errors
    return true;
  }

  /**
   * Check if a 429 (Rate Limited) error should trigger adaptive backoff
   * @param {Error} error - Error object
   * @returns {boolean} True if 429 error
   */
  is429Error(error) {
    return error.status === 429 || error.statusCode === 429;
  }

  /**
   * Special handling for 429 rate limit errors
   * Pauses for 30 seconds regardless of retry attempt
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Options
   * @returns {Promise}
   */
  async executeWith429Handling(fn, options = {}) {
    const customShouldRetry = (error) => {
      if (this.is429Error(error)) {
        return true;
      }
      return this.defaultShouldRetry(error);
    };

    const customOnRetry = async (attempt, delayMs, error) => {
      if (this.is429Error(error)) {
        console.warn(
          '[RetryHandler] 429 Rate Limit detected - pausing for 30 seconds'
        );
        await this.sleep(30000); // Pause 30 seconds for 429

        // Notify caller to reduce rate if callback provided
        if (options.onRateLimitDetected) {
          options.onRateLimitDetected();
        }
      }
    };

    return this.execute(fn, {
      ...options,
      shouldRetry: customShouldRetry,
      onRetry: customOnRetry,
    });
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics
   * @returns {Object} Retry stats
   */
  getStats() {
    return {
      maxRetries: this.maxRetries,
      baseDelayMs: this.baseDelayMs,
      retryCount: this.retryCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      totalRequests: this.successCount + this.failureCount,
      successRate:
        this.successCount + this.failureCount > 0
          ? (this.successCount / (this.successCount + this.failureCount)) * 100
          : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.retryCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
  }

  /**
   * Create a fetch wrapper with retry logic
   * @param {string} url - URL to fetch
   * @param {Object} fetchOptions - fetch() options
   * @param {Object} retryOptions - Retry options
   * @returns {Promise<Response>} Fetch response
   */
  async fetchWithRetry(url, fetchOptions = {}, retryOptions = {}) {
    const fetchFn = async () => {
      const response = await fetch(url, fetchOptions);

      // Check if response is ok
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return response;
    };

    return this.executeWith429Handling(fetchFn, {
      ...retryOptions,
      context: `Fetch ${url}`,
    });
  }

  /**
   * Create a function that retries on specific error types
   * @param {Array<string>} errorTypes - Error type names to retry
   * @returns {Function} shouldRetry function
   */
  createShouldRetryFor(errorTypes) {
    return (error) => {
      if (error.name && errorTypes.includes(error.name)) {
        return true;
      }
      return this.defaultShouldRetry(error);
    };
  }
}

// Create default instance
const defaultRetryHandler = new RetryHandler(3, 1000);

// Export for browser (window) and Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.RetryHandler = RetryHandler;
  window.defaultRetryHandler = defaultRetryHandler;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RetryHandler, defaultRetryHandler };
}
