import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache } from '../src/cache.js';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache({ maxSize: 100, ttl: 0 });
  });

  describe('basic operations', () => {
    it('sets and gets a value', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('returns undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('stores complex objects', () => {
      const data = { userId: 1, name: 'Alice', roles: ['admin'] };
      cache.set('user:1', data);
      expect(cache.get('user:1')).toEqual(data);
    });

    it('overwrites existing values', () => {
      cache.set('key', 'v1');
      cache.set('key', 'v2');
      expect(cache.get('key')).toBe('v2');
    });
  });

  describe('delete', () => {
    it('removes a key and returns true', () => {
      cache.set('key', 'value');
      expect(cache.delete('key')).toBe(true);
      expect(cache.get('key')).toBeUndefined();
    });

    it('returns false for missing keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.clear();
      expect(cache.length).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('length', () => {
    it('returns the count of stored entries', () => {
      expect(cache.length).toBe(0);
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.length).toBe(2);
    });
  });

  describe('has', () => {
    it('returns true for existing keys', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('returns false for missing keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('keys', () => {
    it('returns all stored keys', () => {
      cache.set('x', 1);
      cache.set('y', 2);
      cache.set('z', 3);
      expect(cache.keys().sort()).toEqual(['x', 'y', 'z']);
    });
  });

  describe('TTL expiry', () => {
    it('expires entries after TTL', () => {
      vi.useFakeTimers();
      try {
        const ttlCache = new Cache({ ttl: 1 }); // 1 second default TTL
        ttlCache.set('key', 'value');
        expect(ttlCache.get('key')).toBe('value');

        // Advance past TTL
        vi.advanceTimersByTime(1500);
        expect(ttlCache.get('key')).toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });

    it('supports per-key TTL override', () => {
      vi.useFakeTimers();
      try {
        const ttlCache = new Cache({ ttl: 10 }); // 10 second default
        ttlCache.set('short', 'value', 1); // 1 second override
        ttlCache.set('long', 'value'); // uses 10 second default

        vi.advanceTimersByTime(2000);
        expect(ttlCache.get('short')).toBeUndefined();
        expect(ttlCache.get('long')).toBe('value');
      } finally {
        vi.useRealTimers();
      }
    });

    it('no expiry when ttl is 0', () => {
      vi.useFakeTimers();
      try {
        cache.set('key', 'value'); // default ttl = 0
        vi.advanceTimersByTime(100000);
        expect(cache.get('key')).toBe('value');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entries when max size exceeded', () => {
      const smallCache = new Cache({ maxSize: 3 });
      smallCache.set('a', 1);
      smallCache.set('b', 2);
      smallCache.set('c', 3);
      smallCache.set('d', 4); // triggers eviction of 'a'

      expect(smallCache.get('a')).toBeUndefined();
      expect(smallCache.get('b')).toBe(2);
      expect(smallCache.get('c')).toBe(3);
      expect(smallCache.get('d')).toBe(4);
    });

    it('overwriting resets LRU position', () => {
      const smallCache = new Cache({ maxSize: 3 });
      smallCache.set('a', 1);
      smallCache.set('b', 2);
      smallCache.set('c', 3);
      smallCache.set('a', 10); // refresh 'a', now 'b' is oldest
      smallCache.set('d', 4); // evicts 'b' (oldest after refresh)

      expect(smallCache.get('a')).toBe(10);
      expect(smallCache.get('b')).toBeUndefined();
      expect(smallCache.get('c')).toBe(3);
      expect(smallCache.get('d')).toBe(4);
    });
  });

  describe('evictExpired', () => {
    it('removes all expired entries', () => {
      vi.useFakeTimers();
      try {
        const ttlCache = new Cache({ ttl: 1 });
        ttlCache.set('a', 1);
        ttlCache.set('b', 2);
        ttlCache.set('c', 3, 10); // longer TTL

        vi.advanceTimersByTime(2000);
        ttlCache.evictExpired();

        expect(ttlCache.keys()).toEqual(['c']);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('default options', () => {
    it('creates with defaults when no options given', () => {
      const defaultCache = new Cache();
      defaultCache.set('key', 'value');
      expect(defaultCache.get('key')).toBe('value');
    });
  });
});
