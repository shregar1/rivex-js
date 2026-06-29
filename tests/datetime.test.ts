import { describe, it, expect } from 'vitest';
import {
  nowIso,
  nowTimestamp,
  parseIso8601,
  formatIso8601,
  timestampToIso,
  isoToTimestamp,
  formatHttpDate,
  parseHttpDate,
} from '../src/datetime.js';

describe('DateTime utilities', () => {
  describe('nowIso', () => {
    it('returns an ISO 8601 string', () => {
      const result = nowIso();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('returns a parseable date', () => {
      const result = nowIso();
      expect(new Date(result).getTime()).not.toBeNaN();
    });
  });

  describe('nowTimestamp', () => {
    it('returns a Unix timestamp in seconds', () => {
      const ts = nowTimestamp();
      expect(ts).toBeGreaterThan(1700000000);
      expect(ts).toBeLessThan(2000000000);
    });
  });

  describe('parseIso8601', () => {
    it('parses a valid ISO 8601 string', () => {
      const date = parseIso8601('2024-01-15T10:30:00.000Z');
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0); // January
      expect(date.getUTCDate()).toBe(15);
    });

    it('throws on invalid input', () => {
      expect(() => parseIso8601('not a date')).toThrow();
    });
  });

  describe('formatIso8601', () => {
    it('formats a Date to ISO 8601', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatIso8601(date)).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('timestampToIso / isoToTimestamp', () => {
    it('converts timestamp to ISO string', () => {
      const iso = timestampToIso(1705312200);
      expect(iso).toMatch(/^2024-01-15T/);
    });

    it('converts ISO string to timestamp', () => {
      const ts = isoToTimestamp('2024-01-15T10:30:00.000Z');
      expect(ts).toBe(new Date('2024-01-15T10:30:00.000Z').getTime() / 1000);
    });

    it('roundtrips correctly', () => {
      const original = Math.floor(Date.now() / 1000);
      const roundtrip = isoToTimestamp(timestampToIso(original));
      expect(roundtrip).toBe(original);
    });
  });

  describe('HTTP dates', () => {
    it('formats an HTTP date', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const httpDate = formatHttpDate(date);
      expect(httpDate).toContain('Mon');
      expect(httpDate).toContain('Jan');
      expect(httpDate).toContain('2024');
    });

    it('parses an HTTP date', () => {
      const date = parseHttpDate('Mon, 15 Jan 2024 10:30:00 GMT');
      expect(date.getUTCFullYear()).toBe(2024);
    });

    it('throws on invalid input', () => {
      expect(() => parseHttpDate('not a date')).toThrow();
    });
  });
});
