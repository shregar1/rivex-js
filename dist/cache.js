/**
 * In-memory LRU/TTL cache with an API matching the Rust-backed Python Cache.
 *
 * This is a pure TypeScript implementation using Map (which preserves
 * insertion order) for LRU eviction and timestamps for TTL expiry.
 *
 * @example
 * ```ts
 * import { Cache } from 'rivex';
 *
 * const cache = new Cache({ maxSize: 5000, ttl: 60 });
 * cache.set('session:abc', { userId: 1 });
 * const user = cache.get<{ userId: number }>('session:abc');
 * ```
 */
export class Cache {
    store = new Map();
    maxSize;
    defaultTtl; // seconds
    /**
     * Create a new cache.
     *
     * @param options.maxSize — Maximum entries (0 = unlimited)
     * @param options.ttl — Default TTL in seconds (0 = no expiry)
     */
    constructor(options = {}) {
        this.maxSize = options.maxSize && options.maxSize > 0 ? options.maxSize : Infinity;
        this.defaultTtl = options.ttl ?? 0;
    }
    /**
     * Retrieve a cached value, or `undefined` if missing/expired.
     */
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    /**
     * Store a value with an optional per-key TTL override.
     *
     * @param key — Cache key
     * @param value — Any serializable value
     * @param ttl — Per-key TTL in seconds (overrides default). 0 = no expiry.
     */
    set(key, value, ttl) {
        // Remove existing entry to reset insertion order for LRU
        this.store.delete(key);
        const effectiveTtl = ttl !== undefined ? ttl : this.defaultTtl;
        const expiresAt = effectiveTtl > 0 ? Date.now() + effectiveTtl * 1000 : null;
        this.store.set(key, { value, expiresAt });
        // LRU eviction: if over max, remove oldest entry (first in Map)
        if (this.store.size > this.maxSize) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey !== undefined) {
                this.store.delete(oldestKey);
            }
        }
    }
    /**
     * Remove a key. Returns `true` if the key existed.
     */
    delete(key) {
        return this.store.delete(key);
    }
    /**
     * Remove all entries.
     */
    clear() {
        this.store.clear();
    }
    /**
     * Number of non-expired entries.
     */
    get length() {
        let count = 0;
        const now = Date.now();
        for (const entry of this.store.values()) {
            if (entry.expiresAt === null || now < entry.expiresAt) {
                count++;
            }
        }
        return count;
    }
    /**
     * Check whether a non-expired entry exists for the given key.
     */
    has(key) {
        const entry = this.store.get(key);
        if (!entry)
            return false;
        if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        return true;
    }
    /**
     * All non-expired keys.
     */
    keys() {
        const result = [];
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (entry.expiresAt === null || now < entry.expiresAt) {
                result.push(key);
            }
        }
        return result;
    }
    /**
     * Manually sweep all expired entries.
     */
    evictExpired() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (entry.expiresAt !== null && now >= entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }
}
//# sourceMappingURL=cache.js.map