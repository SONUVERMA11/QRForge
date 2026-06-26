/**
 * QRForge — Cache Service
 * 
 * LRU in-memory cache for the redirect hot path.
 * Interface is designed for drop-in Redis replacement.
 * 
 * Strategy: Cache redirect data for 5 minutes.
 * On admin update, immediately invalidate the cache entry.
 */

class LRUCache {
  /**
   * @param {number} maxSize - Maximum number of entries
   * @param {number} defaultTTL - Default TTL in seconds
   */
  constructor(maxSize = 10000, defaultTTL = 300) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Get a value from cache.
   * @param {string} key
   * @returns {*} Cached value or null
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL expiry
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set a value in cache with optional TTL.
   * @param {string} key
   * @param {*} value
   * @param {number} ttl - TTL in seconds (default: 300)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : null,
    });
    this.stats.sets++;
  }

  /**
   * Delete a specific key. Used for cache invalidation on redirect update.
   * @param {string} key
   * @returns {boolean} Whether the key existed
   */
  delete(key) {
    this.stats.deletes++;
    return this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries for a QR code.
   * @param {string} shortCode
   */
  invalidateRedirect(shortCode) {
    this.delete(`redirect:${shortCode}`);
  }

  /**
   * Clear all cached data.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   * @returns {Object} Hit rate and counts
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(1) + '%' : 'N/A',
    };
  }
}

// Singleton instance
export const cache = new LRUCache();

export default cache;
