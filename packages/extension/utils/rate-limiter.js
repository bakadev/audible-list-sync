/**
 * Rate Limiter - Promise queue with configurable throttling
 *
 * Throttles HTTP requests to Audible servers to prevent overload
 * Default: 10 requests/second
 * Configurable range: 1-20 requests/second
 */

class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.requestsPerSecond = Math.max(1, Math.min(20, requestsPerSecond));
    this.delayMs = 1000 / this.requestsPerSecond;
    this.queue = [];
    this.processing = false;
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.totalRequests = 0;
  }

  /**
   * Update rate limit setting
   * @param {number} requestsPerSecond - New rate (1-20 req/sec)
   */
  setRate(requestsPerSecond) {
    this.requestsPerSecond = Math.max(1, Math.min(20, requestsPerSecond));
    this.delayMs = 1000 / this.requestsPerSecond;
    console.log(`[RateLimiter] Rate updated to ${this.requestsPerSecond} req/sec`);
  }

  /**
   * Get current rate limit
   * @returns {number} Requests per second
   */
  getRate() {
    return this.requestsPerSecond;
  }

  /**
   * Get delay between requests in milliseconds
   * @returns {number} Delay in ms
   */
  getDelay() {
    return this.delayMs;
  }

  /**
   * Add a request to the queue
   * @param {Function} requestFn - Async function that makes the request
   * @returns {Promise} Promise that resolves with the request result
   */
  async enqueue(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        requestFn,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      });

      // Start processing if not already processing
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      // Wait if we need to throttle
      if (timeSinceLastRequest < this.delayMs) {
        const waitTime = this.delayMs - timeSinceLastRequest;
        await this.sleep(waitTime);
      }

      // Get next request from queue
      const { requestFn, resolve, reject, enqueuedAt } = this.queue.shift();

      try {
        // Execute the request
        const startTime = Date.now();
        const result = await requestFn();
        const duration = Date.now() - startTime;
        const queueTime = startTime - enqueuedAt;

        this.lastRequestTime = Date.now();
        this.requestCount++;
        this.totalRequests++;

        // Log performance metrics periodically
        if (this.requestCount % 10 === 0) {
          console.log(
            `[RateLimiter] ${this.requestCount} requests processed (queue time: ${queueTime}ms, request time: ${duration}ms)`
          );
        }

        resolve(result);
      } catch (error) {
        console.error('[RateLimiter] Request failed:', error);
        reject(error);
      }
    }

    this.processing = false;
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
   * Get queue statistics
   * @returns {Object} Queue stats
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      requestsPerSecond: this.requestsPerSecond,
      delayMs: this.delayMs,
      requestCount: this.requestCount,
      totalRequests: this.totalRequests,
      lastRequestTime: this.lastRequestTime,
    };
  }

  /**
   * Clear the queue and reset
   */
  clear() {
    // Reject all pending requests
    this.queue.forEach(({ reject }) => {
      reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.processing = false;
    this.requestCount = 0;
    console.log('[RateLimiter] Queue cleared');
  }

  /**
   * Pause processing (for manual intervention)
   */
  pause() {
    this.processing = false;
    console.log('[RateLimiter] Processing paused');
  }

  /**
   * Resume processing
   */
  resume() {
    if (!this.processing && this.queue.length > 0) {
      console.log('[RateLimiter] Processing resumed');
      this.processQueue();
    }
  }

  /**
   * Check if rate limiter is idle (no pending requests)
   * @returns {boolean}
   */
  isIdle() {
    return this.queue.length === 0 && !this.processing;
  }

  /**
   * Wait until all pending requests are processed
   * @param {number} timeoutMs - Maximum wait time in milliseconds
   * @returns {Promise<void>}
   */
  async waitUntilIdle(timeoutMs = 30000) {
    const startTime = Date.now();

    while (!this.isIdle()) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Rate limiter idle timeout');
      }
      await this.sleep(100);
    }
  }

  /**
   * Estimate time to process N requests at current rate
   * @param {number} requestCount - Number of requests
   * @returns {number} Estimated milliseconds
   */
  estimateTime(requestCount) {
    return Math.ceil(requestCount * this.delayMs);
  }

  /**
   * Format estimated time as human-readable string
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted time string
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Create default instance
const defaultRateLimiter = new RateLimiter(10);

// Export for browser (window) and Node.js (module.exports)
if (typeof window !== 'undefined') {
  window.RateLimiter = RateLimiter;
  window.defaultRateLimiter = defaultRateLimiter;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RateLimiter, defaultRateLimiter };
}
