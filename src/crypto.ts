/**
 * HMAC and SHA digest utilities.
 *
 * Uses Node.js `crypto` module which delegates to OpenSSL — fast and
 * battle-tested. API mirrors the Rust-backed Python implementation.
 *
 * @example
 * ```ts
 * import { sha256, hmacSHA256, hmacSHA256Verify } from 'rivex';
 *
 * const digest = sha256('hello world');
 * const sig = hmacSHA256('secret-key', 'webhook-body');
 * const ok = hmacSHA256Verify('secret-key', 'webhook-body', sig);
 * ```
 */

import { createHash, createHmac, timingSafeEqual, randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync, generateKeyPairSync, sign, verify, createPrivateKey, createPublicKey } from 'node:crypto';

// ---------------------------------------------------------------------------
// SHA digests
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 hash. Returns a 64-character hex string.
 */
export function sha256(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Compute SHA-512 hash. Returns a 128-character hex string.
 */
export function sha512(data: string | Uint8Array): string {
  return createHash('sha512').update(data).digest('hex');
}

/**
 * Compute SHA-256 hash. Returns raw bytes.
 */
export function sha256Bytes(data: string | Uint8Array): Uint8Array {
  return createHash('sha256').update(data).digest();
}

/**
 * Compute SHA-512 hash. Returns raw bytes.
 */
export function sha512Bytes(data: string | Uint8Array): Uint8Array {
  return createHash('sha512').update(data).digest();
}

// ---------------------------------------------------------------------------
// HMAC
// ---------------------------------------------------------------------------

/**
 * Compute HMAC-SHA256. Returns a 64-character hex string.
 */
export function hmacSHA256(key: string | Uint8Array, message: string | Uint8Array): string {
  return createHmac('sha256', key).update(message).digest('hex');
}

/**
 * Compute HMAC-SHA512. Returns a 128-character hex string.
 */
export function hmacSHA512(key: string | Uint8Array, message: string | Uint8Array): string {
  return createHmac('sha512', key).update(message).digest('hex');
}

/**
 * Compute HMAC-SHA256. Returns raw bytes.
 */
export function hmacSHA256Bytes(key: string | Uint8Array, message: string | Uint8Array): Uint8Array {
  return createHmac('sha256', key).update(message).digest();
}

/**
 * Compute HMAC-SHA512. Returns raw bytes.
 */
export function hmacSHA512Bytes(key: string | Uint8Array, message: string | Uint8Array): Uint8Array {
  return createHmac('sha512', key).update(message).digest();
}

/**
 * Verify an HMAC-SHA256 signature using constant-time comparison.
 *
 * @param signatureHex — Expected signature as a hex string
 */
export function hmacSHA256Verify(
  key: string | Uint8Array,
  message: string | Uint8Array,
  signatureHex: string,
): boolean {
  const computed = createHmac('sha256', key).update(message).digest();
  const expected = Buffer.from(signatureHex, 'hex');
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

/**
 * Verify an HMAC-SHA512 signature using constant-time comparison.
 */
export function hmacSHA512Verify(
  key: string | Uint8Array,
  message: string | Uint8Array,
  signatureHex: string,
): boolean {
  const computed = createHmac('sha512', key).update(message).digest();
  const expected = Buffer.from(signatureHex, 'hex');
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

// ---------------------------------------------------------------------------
// AES-256-GCM
// ---------------------------------------------------------------------------

/**
 * Encrypt plaintext with AES-256-GCM.
 *
 * @param key - 32-byte key (Uint8Array or hex string)
 * @param plaintext - Data to encrypt
 * @returns Buffer containing nonce(12) || ciphertext || tag(16)
 */
export function aesGcmEncrypt(key: Uint8Array | string, plaintext: Uint8Array | string): Uint8Array {
  const keyBuf = typeof key === 'string' ? Buffer.from(key, 'hex') : Buffer.from(key);
  if (keyBuf.length !== 32) throw new Error('AES-256-GCM key must be exactly 32 bytes');

  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuf, nonce);

  const ptBuf = typeof plaintext === 'string' ? Buffer.from(plaintext) : plaintext;
  const encrypted = Buffer.concat([cipher.update(ptBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  // nonce (12) || ciphertext || tag (16)
  return Buffer.concat([nonce, encrypted, tag]);
}

/**
 * Decrypt AES-256-GCM ciphertext.
 *
 * @param key - 32-byte key
 * @param data - nonce(12) || ciphertext || tag(16)
 * @returns Decrypted plaintext
 */
export function aesGcmDecrypt(key: Uint8Array | string, data: Uint8Array): Uint8Array {
  const keyBuf = typeof key === 'string' ? Buffer.from(key, 'hex') : Buffer.from(key);
  if (keyBuf.length !== 32) throw new Error('AES-256-GCM key must be exactly 32 bytes');
  if (data.length < 28) throw new Error('Ciphertext too short (need at least 28 bytes)');

  const nonce = data.slice(0, 12);
  const tag = data.slice(data.length - 16);
  const ciphertext = data.slice(12, data.length - 16);

  const decipher = createDecipheriv('aes-256-gcm', keyBuf, nonce);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ---------------------------------------------------------------------------
// PBKDF2
// ---------------------------------------------------------------------------

/**
 * Derive a key using PBKDF2-HMAC-SHA256 (synchronous).
 *
 * @param password - Password bytes or string
 * @param salt - Salt bytes or string (should be >=16 random bytes)
 * @param iterations - Number of iterations (recommended >=100000)
 * @param keyLength - Output key length in bytes (default 32)
 * @returns Derived key bytes
 */
export function pbkdf2Derive(
  password: string | Uint8Array,
  salt: string | Uint8Array,
  iterations: number = 100_000,
  keyLength: number = 32,
): Uint8Array {
  return pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
}

/**
 * Verify a password against a PBKDF2-derived key.
 */
export function pbkdf2Verify(
  password: string | Uint8Array,
  salt: string | Uint8Array,
  iterations: number,
  expectedKey: Uint8Array,
): boolean {
  const derived = pbkdf2Derive(password, salt, iterations, expectedKey.length);
  if (derived.length !== expectedKey.length) return false;
  return timingSafeEqual(Buffer.from(derived), Buffer.from(expectedKey));
}

// ---------------------------------------------------------------------------
// Secure random
// ---------------------------------------------------------------------------

/**
 * Generate cryptographically secure random bytes.
 */
export function secureRandomBytes(n: number): Uint8Array {
  return randomBytes(n);
}

/**
 * Generate a URL-safe random token (base64url-encoded, no padding).
 *
 * @param nBytes - Number of random bytes (default 32 -> 43-char token)
 */
export function randomToken(nBytes: number = 32): string {
  return randomBytes(nBytes).toString('base64url');
}

/**
 * Generate a random hex token.
 *
 * @param nBytes - Number of random bytes (default 32 -> 64-char hex)
 */
export function randomHex(nBytes: number = 32): string {
  return randomBytes(nBytes).toString('hex');
}

// ---------------------------------------------------------------------------
// Ed25519
// ---------------------------------------------------------------------------

/**
 * Generate an Ed25519 keypair.
 *
 * @returns Object with `privateKey` (32 bytes) and `publicKey` (32 bytes)
 */
export function ed25519Keygen(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  // Export as raw bytes (DER -> extract last 32 bytes for raw key)
  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });

  // Ed25519 SPKI DER is 44 bytes: 12-byte header + 32-byte key
  const pubRaw = pubDer.slice(pubDer.length - 32);
  // Ed25519 PKCS8 DER is 48 bytes: 16-byte header + 32-byte key
  const privRaw = privDer.slice(privDer.length - 32);

  return {
    privateKey: new Uint8Array(privRaw),
    publicKey: new Uint8Array(pubRaw),
  };
}

/**
 * Sign a message with an Ed25519 private key.
 *
 * @param privateKey - 32-byte raw private key
 * @param message - Message to sign
 * @returns 64-byte signature
 */
export function ed25519Sign(privateKey: Uint8Array, message: Uint8Array | string): Uint8Array {
  if (privateKey.length !== 32) throw new Error('Ed25519 private key must be exactly 32 bytes');

  // Wrap raw 32-byte seed into PKCS8 DER
  const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
  const der = Buffer.concat([pkcs8Header, Buffer.from(privateKey)]);

  const keyObj = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  const msgBuf = typeof message === 'string' ? Buffer.from(message) : message;
  return sign(null, msgBuf, keyObj);
}

/**
 * Verify an Ed25519 signature.
 *
 * @param publicKey - 32-byte raw public key
 * @param message - Original message
 * @param signature - 64-byte signature
 * @returns true if valid
 */
export function ed25519Verify(
  publicKey: Uint8Array,
  message: Uint8Array | string,
  signature: Uint8Array,
): boolean {
  if (publicKey.length !== 32) throw new Error('Ed25519 public key must be exactly 32 bytes');
  if (signature.length !== 64) throw new Error('Ed25519 signature must be exactly 64 bytes');

  // Wrap raw 32-byte key into SPKI DER
  const spkiHeader = Buffer.from('302a300506032b6570032100', 'hex');
  const der = Buffer.concat([spkiHeader, Buffer.from(publicKey)]);

  const keyObj = createPublicKey({ key: der, format: 'der', type: 'spki' });
  const msgBuf = typeof message === 'string' ? Buffer.from(message) : message;
  return verify(null, msgBuf, keyObj, Buffer.from(signature));
}
