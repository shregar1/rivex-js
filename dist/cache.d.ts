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
export interface CacheOptions {
    /** Maximum entries before LRU eviction (default: 1000, 0 = unlimited) */
    maxSize?: number;
    /** Default TTL in seconds (default: 0 = no expiry) */
    ttl?: number;
}
export declare class Cache {
    private store;
    private maxSize;
    private defaultTtl;
    /**
     * Create a new cache.
     *
     * @param options.maxSize — Maximum entries (0 = unlimited)
     * @param options.ttl — Default TTL in seconds (0 = no expiry)
     */
    constructor(options?: CacheOptions);
    /**
     * Retrieve a cached value, or `undefined` if missing/expired.
     */
    get<T = unknown>(key: string): T | undefined;
    /**
     * Store a value with an optional per-key TTL override.
     *
     * @param key — Cache key
     * @param value — Any serializable value
     * @param ttl — Per-key TTL in seconds (overrides default). 0 = no expiry.
     */
    set(key: string, value: unknown, ttl?: number): void;
    /**
     * Remove a key. Returns `true` if the key existed.
     */
    delete(key: string): boolean;
    /**
     * Remove all entries.
     */
    clear(): void;
    /**
     * Number of non-expired entries.
     */
    get length(): number;
    /**
     * Check whether a non-expired entry exists for the given key.
     */
    has(key: string): boolean;
    /**
     * All non-expired keys.
     */
    keys(): string[];
    /**
     * Manually sweep all expired entries.
     */
    evictExpired(): void;
}
//# sourceMappingURL=cache.d.ts.map