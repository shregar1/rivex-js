import { describe, it, expect } from 'vitest';
import {
  sha256, sha512, sha256Bytes, sha512Bytes,
  hmacSHA256, hmacSHA512, hmacSHA256Bytes, hmacSHA512Bytes,
  hmacSHA256Verify, hmacSHA512Verify,
  aesGcmEncrypt, aesGcmDecrypt,
  pbkdf2Derive, pbkdf2Verify,
  secureRandomBytes, randomToken, randomHex,
  ed25519Keygen, ed25519Sign, ed25519Verify,
} from '../src/crypto.js';

describe('Crypto utilities', () => {
  describe('SHA-256', () => {
    it('computes correct hash of "hello"', () => {
      expect(sha256('hello')).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
      );
    });

    it('computes correct hash of empty string', () => {
      expect(sha256('')).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
    });

    it('returns 64-char hex string', () => {
      expect(sha256('test')).toHaveLength(64);
    });

    it('returns raw bytes', () => {
      const bytes = sha256Bytes('hello');
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(32);
    });

    it('accepts Uint8Array input', () => {
      const result = sha256(new Uint8Array([104, 101, 108, 108, 111])); // "hello"
      expect(result).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
      );
    });
  });

  describe('SHA-512', () => {
    it('computes correct hash', () => {
      const hash = sha512('hello');
      expect(hash).toHaveLength(128);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('returns raw bytes', () => {
      const bytes = sha512Bytes('hello');
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(64);
    });
  });

  describe('HMAC-SHA256', () => {
    it('computes correct HMAC', () => {
      const sig = hmacSHA256('secret', 'message');
      expect(sig).toHaveLength(64);
      expect(sig).toMatch(/^[0-9a-f]+$/);
    });

    it('produces different output for different keys', () => {
      const sig1 = hmacSHA256('key1', 'message');
      const sig2 = hmacSHA256('key2', 'message');
      expect(sig1).not.toBe(sig2);
    });

    it('produces different output for different messages', () => {
      const sig1 = hmacSHA256('key', 'message1');
      const sig2 = hmacSHA256('key', 'message2');
      expect(sig1).not.toBe(sig2);
    });

    it('is deterministic', () => {
      const sig1 = hmacSHA256('key', 'msg');
      const sig2 = hmacSHA256('key', 'msg');
      expect(sig1).toBe(sig2);
    });

    it('returns raw bytes', () => {
      const bytes = hmacSHA256Bytes('key', 'message');
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(32);
    });
  });

  describe('HMAC-SHA512', () => {
    it('computes correct HMAC', () => {
      const sig = hmacSHA512('secret', 'message');
      expect(sig).toHaveLength(128);
    });

    it('returns raw bytes', () => {
      const bytes = hmacSHA512Bytes('key', 'message');
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(64);
    });
  });

  describe('HMAC verification', () => {
    it('verifies valid HMAC-SHA256 signature', () => {
      const sig = hmacSHA256('secret', 'payload');
      expect(hmacSHA256Verify('secret', 'payload', sig)).toBe(true);
    });

    it('rejects invalid HMAC-SHA256 signature', () => {
      const sig = hmacSHA256('secret', 'payload');
      expect(hmacSHA256Verify('wrong-key', 'payload', sig)).toBe(false);
    });

    it('rejects tampered message', () => {
      const sig = hmacSHA256('secret', 'payload');
      expect(hmacSHA256Verify('secret', 'tampered', sig)).toBe(false);
    });

    it('verifies valid HMAC-SHA512 signature', () => {
      const sig = hmacSHA512('secret', 'payload');
      expect(hmacSHA512Verify('secret', 'payload', sig)).toBe(true);
    });

    it('rejects invalid HMAC-SHA512 signature', () => {
      expect(hmacSHA512Verify('key', 'msg', 'deadbeef'.repeat(16))).toBe(false);
    });

    it('rejects malformed hex signature', () => {
      expect(hmacSHA256Verify('key', 'msg', 'not-hex')).toBe(false);
    });

    it('rejects wrong-length signature', () => {
      expect(hmacSHA256Verify('key', 'msg', 'abcd')).toBe(false);
    });
  });

  describe('AES-256-GCM', () => {
    it('encrypts and decrypts roundtrip', () => {
      const key = secureRandomBytes(32);
      const plaintext = Buffer.from('hello world');
      const encrypted = aesGcmEncrypt(key, plaintext);
      expect(encrypted.length).toBeGreaterThan(28); // 12 nonce + data + 16 tag
      const decrypted = aesGcmDecrypt(key, encrypted);
      expect(Buffer.from(decrypted).toString()).toBe('hello world');
    });

    it('rejects wrong key', () => {
      const key1 = secureRandomBytes(32);
      const key2 = secureRandomBytes(32);
      const encrypted = aesGcmEncrypt(key1, Buffer.from('secret'));
      expect(() => aesGcmDecrypt(key2, encrypted)).toThrow();
    });

    it('rejects tampered ciphertext', () => {
      const key = secureRandomBytes(32);
      const encrypted = aesGcmEncrypt(key, Buffer.from('secret'));
      const tampered = new Uint8Array(encrypted);
      tampered[20] ^= 0xff; // flip a byte
      expect(() => aesGcmDecrypt(key, tampered)).toThrow();
    });

    it('rejects invalid key length', () => {
      expect(() => aesGcmEncrypt(new Uint8Array(16), Buffer.from('test'))).toThrow();
    });

    it('produces different ciphertexts for same input (random nonce)', () => {
      const key = secureRandomBytes(32);
      const ct1 = aesGcmEncrypt(key, Buffer.from('same'));
      const ct2 = aesGcmEncrypt(key, Buffer.from('same'));
      expect(Buffer.from(ct1).toString('hex')).not.toBe(Buffer.from(ct2).toString('hex'));
    });
  });

  describe('PBKDF2', () => {
    it('derives a key of requested length', () => {
      const dk = pbkdf2Derive('password', 'salt', 1000, 32);
      expect(dk).toBeInstanceOf(Uint8Array);
      expect(dk.length).toBe(32);
    });

    it('is deterministic', () => {
      const dk1 = pbkdf2Derive('password', 'salt', 1000, 32);
      const dk2 = pbkdf2Derive('password', 'salt', 1000, 32);
      expect(Buffer.from(dk1).toString('hex')).toBe(Buffer.from(dk2).toString('hex'));
    });

    it('different passwords produce different keys', () => {
      const dk1 = pbkdf2Derive('password1', 'salt', 1000, 32);
      const dk2 = pbkdf2Derive('password2', 'salt', 1000, 32);
      expect(Buffer.from(dk1).toString('hex')).not.toBe(Buffer.from(dk2).toString('hex'));
    });

    it('verifies correct password', () => {
      const salt = secureRandomBytes(16);
      const dk = pbkdf2Derive('mypassword', salt, 10000, 32);
      expect(pbkdf2Verify('mypassword', salt, 10000, dk)).toBe(true);
    });

    it('rejects wrong password', () => {
      const salt = secureRandomBytes(16);
      const dk = pbkdf2Derive('mypassword', salt, 10000, 32);
      expect(pbkdf2Verify('wrongpassword', salt, 10000, dk)).toBe(false);
    });
  });

  describe('Secure random', () => {
    it('generates bytes of requested length', () => {
      const bytes = secureRandomBytes(16);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(16);
    });

    it('generates different values each call', () => {
      const a = secureRandomBytes(32);
      const b = secureRandomBytes(32);
      expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'));
    });

    it('generates URL-safe token', () => {
      const token = randomToken(32);
      expect(token.length).toBe(43); // base64url of 32 bytes
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('generates hex token', () => {
      const hex = randomHex(16);
      expect(hex.length).toBe(32); // 16 bytes * 2
      expect(hex).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('Ed25519', () => {
    it('generates keypair with correct sizes', () => {
      const { privateKey, publicKey } = ed25519Keygen();
      expect(privateKey).toBeInstanceOf(Uint8Array);
      expect(publicKey).toBeInstanceOf(Uint8Array);
      expect(privateKey.length).toBe(32);
      expect(publicKey.length).toBe(32);
    });

    it('signs and verifies a message', () => {
      const { privateKey, publicKey } = ed25519Keygen();
      const message = Buffer.from('test message');
      const sig = ed25519Sign(privateKey, message);
      expect(sig.length).toBe(64);
      expect(ed25519Verify(publicKey, message, sig)).toBe(true);
    });

    it('rejects tampered message', () => {
      const { privateKey, publicKey } = ed25519Keygen();
      const sig = ed25519Sign(privateKey, Buffer.from('original'));
      expect(ed25519Verify(publicKey, Buffer.from('tampered'), sig)).toBe(false);
    });

    it('rejects wrong public key', () => {
      const kp1 = ed25519Keygen();
      const kp2 = ed25519Keygen();
      const sig = ed25519Sign(kp1.privateKey, Buffer.from('test'));
      expect(ed25519Verify(kp2.publicKey, Buffer.from('test'), sig)).toBe(false);
    });

    it('produces deterministic signatures', () => {
      const { privateKey } = ed25519Keygen();
      const msg = Buffer.from('deterministic');
      const sig1 = ed25519Sign(privateKey, msg);
      const sig2 = ed25519Sign(privateKey, msg);
      expect(Buffer.from(sig1).toString('hex')).toBe(Buffer.from(sig2).toString('hex'));
    });
  });
});
