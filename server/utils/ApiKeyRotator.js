/**
 * API Key Rotator for Gemini
 * Manages multiple API keys to bypass rate limits
 * Implements round-robin with health checking
 */

class ApiKeyRotator {
  constructor(apiKeys = []) {
    this.apiKeys = apiKeys.filter(key => key && key.trim().length > 0);
    this.currentIndex = 0;
    this.keyStats = new Map();
    this.failedKeys = new Set();
    
    // Initialize stats for each key
    this.apiKeys.forEach((key, index) => {
      this.keyStats.set(index, {
        requests: 0,
        failures: 0,
        lastUsed: null,
        rateLimitUntil: null,
      });
    });

    if (this.apiKeys.length === 0) {
      console.warn('[ApiKeyRotator] No API keys provided! Using default from env.');
      this.apiKeys.push(process.env.GEMINI_API_KEY);
    }

    console.log(`[ApiKeyRotator] Initialized with ${this.apiKeys.length} API key(s)`);
  }

  /**
   * Get next available API key using round-robin
   */
  getNextKey() {
    if (this.apiKeys.length === 1) {
      return this.apiKeys[0];
    }

    const startIndex = this.currentIndex;
    let attempts = 0;

    while (attempts < this.apiKeys.length) {
      const keyIndex = this.currentIndex;
      const stats = this.keyStats.get(keyIndex);
      
      // Check if key is rate limited
      if (stats.rateLimitUntil && Date.now() < stats.rateLimitUntil) {
        this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
        attempts++;
        continue;
      }

      // Check if key has too many failures
      if (this.failedKeys.has(keyIndex)) {
        this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
        attempts++;
        continue;
      }

      // Found a good key
      const key = this.apiKeys[keyIndex];
      stats.requests++;
      stats.lastUsed = Date.now();
      
      // Move to next key for next request
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
      
      return key;
    }

    // All keys are rate limited or failed, return the least recently used
    console.warn('[ApiKeyRotator] All keys exhausted, using least recently used');
    return this.apiKeys[startIndex];
  }

  /**
   * Mark a key as rate limited
   */
  markRateLimited(apiKey, durationMs = 60000) {
    const keyIndex = this.apiKeys.indexOf(apiKey);
    if (keyIndex === -1) return;

    const stats = this.keyStats.get(keyIndex);
    stats.rateLimitUntil = Date.now() + durationMs;
    
    console.warn(`[ApiKeyRotator] Key ${keyIndex + 1} rate limited for ${durationMs/1000}s`);
  }

  /**
   * Mark a key as failed
   */
  markFailed(apiKey) {
    const keyIndex = this.apiKeys.indexOf(apiKey);
    if (keyIndex === -1) return;

    const stats = this.keyStats.get(keyIndex);
    stats.failures++;

    // If too many failures, disable the key
    if (stats.failures >= 5) {
      this.failedKeys.add(keyIndex);
      console.error(`[ApiKeyRotator] Key ${keyIndex + 1} disabled due to repeated failures`);
    }
  }

  /**
   * Mark a key as successful (reset failure count)
   */
  markSuccess(apiKey) {
    const keyIndex = this.apiKeys.indexOf(apiKey);
    if (keyIndex === -1) return;

    const stats = this.keyStats.get(keyIndex);
    stats.failures = 0;
    this.failedKeys.delete(keyIndex);
  }

  /**
   * Get statistics for all keys
   */
  getStats() {
    const stats = [];
    this.apiKeys.forEach((key, index) => {
      const keyStats = this.keyStats.get(index);
      stats.push({
        keyIndex: index + 1,
        requests: keyStats.requests,
        failures: keyStats.failures,
        isRateLimited: keyStats.rateLimitUntil && Date.now() < keyStats.rateLimitUntil,
        isFailed: this.failedKeys.has(index),
        lastUsed: keyStats.lastUsed ? new Date(keyStats.lastUsed).toISOString() : null,
      });
    });
    return stats;
  }

  /**
   * Reset all rate limits (useful for testing)
   */
  resetRateLimits() {
    this.keyStats.forEach(stats => {
      stats.rateLimitUntil = null;
    });
    console.log('[ApiKeyRotator] All rate limits reset');
  }

  /**
   * Get total number of available keys
   */
  getAvailableKeyCount() {
    let available = 0;
    this.apiKeys.forEach((key, index) => {
      const stats = this.keyStats.get(index);
      const isRateLimited = stats.rateLimitUntil && Date.now() < stats.rateLimitUntil;
      const isFailed = this.failedKeys.has(index);
      
      if (!isRateLimited && !isFailed) {
        available++;
      }
    });
    return available;
  }
}

// Singleton instance
let rotatorInstance = null;

/**
 * Initialize the API key rotator with keys from environment
 */
function initializeApiKeyRotator() {
  if (rotatorInstance) return rotatorInstance;

  const keys = [];
  
  // Load keys from environment variables
  // GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) {
      keys.push(key.trim());
    }
  }

  // Fallback to default key
  if (keys.length === 0 && process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY);
  }

  rotatorInstance = new ApiKeyRotator(keys);
  return rotatorInstance;
}

/**
 * Get the singleton rotator instance
 */
function getApiKeyRotator() {
  if (!rotatorInstance) {
    return initializeApiKeyRotator();
  }
  return rotatorInstance;
}

module.exports = {
  ApiKeyRotator,
  initializeApiKeyRotator,
  getApiKeyRotator,
};
