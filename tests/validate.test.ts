import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateUrl,
  validateUuid,
  validateIp,
  isAscii,
} from '../src/validate.js';

describe('Validators', () => {
  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('a@b.c')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('@no-local.com')).toBe(false);
      expect(validateEmail('no-domain@')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('accepts valid URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:8080')).toBe(true);
      expect(validateUrl('ftp://files.example.com/path')).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(validateUrl('')).toBe(false);
      expect(validateUrl('not a url')).toBe(false);
    });
  });

  describe('validateUuid', () => {
    it('accepts valid UUIDs', () => {
      expect(validateUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      expect(validateUuid('')).toBe(false);
      expect(validateUuid('not-a-uuid')).toBe(false);
      expect(validateUuid('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });

  describe('validateIp', () => {
    it('accepts valid IPv4 addresses', () => {
      expect(validateIp('192.168.1.1')).toBe(true);
      expect(validateIp('10.0.0.1')).toBe(true);
      expect(validateIp('255.255.255.255')).toBe(true);
    });

    it('rejects invalid IPv4 addresses', () => {
      expect(validateIp('999.999.999.999')).toBe(false);
      expect(validateIp('')).toBe(false);
      expect(validateIp('not-an-ip')).toBe(false);
    });

    it('accepts valid IPv6 addresses', () => {
      expect(validateIp('::1')).toBe(true);
      expect(validateIp('fe80::1')).toBe(true);
    });
  });

  describe('isAscii', () => {
    it('returns true for ASCII strings', () => {
      expect(isAscii('hello world')).toBe(true);
      expect(isAscii('123!@#')).toBe(true);
      expect(isAscii('')).toBe(true);
    });

    it('returns false for non-ASCII strings', () => {
      expect(isAscii('café')).toBe(false);
      expect(isAscii('日本語')).toBe(false);
      expect(isAscii('hello 🌍')).toBe(false);
    });
  });
});
