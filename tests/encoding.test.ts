import { describe, it, expect } from 'vitest';
import {
  b64Encode,
  b64Decode,
  b64urlEncode,
  b64urlDecode,
  hexEncode,
  hexDecode,
  urlEncode,
  urlDecode,
} from '../src/encoding.js';

describe('Encoding utilities', () => {
  describe('Base64', () => {
    it('encodes string to base64', () => {
      expect(b64Encode('Hello, World!')).toBe('SGVsbG8sIFdvcmxkIQ==');
    });

    it('decodes base64 to bytes', () => {
      const decoded = b64Decode('SGVsbG8sIFdvcmxkIQ==');
      expect(Buffer.from(decoded).toString()).toBe('Hello, World!');
    });

    it('roundtrips correctly', () => {
      const original = 'test data with special chars: áéíóú';
      const encoded = b64Encode(original);
      const decoded = Buffer.from(b64Decode(encoded)).toString();
      expect(decoded).toBe(original);
    });

    it('handles empty input', () => {
      expect(b64Encode('')).toBe('');
    });

    it('handles binary data', () => {
      const bytes = new Uint8Array([0, 1, 2, 255, 254, 253]);
      const encoded = b64Encode(bytes);
      const decoded = b64Decode(encoded);
      expect(Array.from(decoded)).toEqual([0, 1, 2, 255, 254, 253]);
    });
  });

  describe('Base64URL', () => {
    it('encodes without padding', () => {
      const encoded = b64urlEncode('Hello, World!');
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
    });

    it('roundtrips correctly', () => {
      const original = 'data with +/= chars';
      const decoded = Buffer.from(b64urlDecode(b64urlEncode(original))).toString();
      expect(decoded).toBe(original);
    });
  });

  describe('Hex', () => {
    it('encodes to hex', () => {
      expect(hexEncode('Hello')).toBe('48656c6c6f');
    });

    it('decodes from hex', () => {
      expect(Buffer.from(hexDecode('48656c6c6f')).toString()).toBe('Hello');
    });

    it('roundtrips correctly', () => {
      const original = 'test data';
      const decoded = Buffer.from(hexDecode(hexEncode(original))).toString();
      expect(decoded).toBe(original);
    });
  });

  describe('URL encoding', () => {
    it('encodes special characters', () => {
      expect(urlEncode('hello world')).toBe('hello%20world');
    });

    it('encodes ampersands', () => {
      expect(urlEncode('a=1&b=2')).toBe('a%3D1%26b%3D2');
    });

    it('decodes URL-encoded strings', () => {
      expect(urlDecode('hello%20world')).toBe('hello world');
    });

    it('roundtrips correctly', () => {
      const original = 'query=hello world&page=1';
      expect(urlDecode(urlEncode(original))).toBe(original);
    });
  });
});
