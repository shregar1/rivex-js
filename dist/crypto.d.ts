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
/**
 * Compute SHA-256 hash. Returns a 64-character hex string.
 */
export declare function sha256(data: string | Uint8Array): string;
/**
 * Compute SHA-512 hash. Returns a 128-character hex string.
 */
export declare function sha512(data: string | Uint8Array): string;
/**
 * Compute SHA-256 hash. Returns raw bytes.
 */
export declare function sha256Bytes(data: string | Uint8Array): Uint8Array;
/**
 * Compute SHA-512 hash. Returns raw bytes.
 */
export declare function sha512Bytes(data: string | Uint8Array): Uint8Array;
/**
 * Compute HMAC-SHA256. Returns a 64-character hex string.
 */
export declare function hmacSHA256(key: string | Uint8Array, message: string | Uint8Array): string;
/**
 * Compute HMAC-SHA512. Returns a 128-character hex string.
 */
export declare function hmacSHA512(key: string | Uint8Array, message: string | Uint8Array): string;
/**
 * Compute HMAC-SHA256. Returns raw bytes.
 */
export declare function hmacSHA256Bytes(key: string | Uint8Array, message: string | Uint8Array): Uint8Array;
/**
 * Compute HMAC-SHA512. Returns raw bytes.
 */
export declare function hmacSHA512Bytes(key: string | Uint8Array, message: string | Uint8Array): Uint8Array;
/**
 * Verify an HMAC-SHA256 signature using constant-time comparison.
 *
 * @param signatureHex — Expected signature as a hex string
 */
export declare function hmacSHA256Verify(key: string | Uint8Array, message: string | Uint8Array, signatureHex: string): boolean;
/**
 * Verify an HMAC-SHA512 signature using constant-time comparison.
 */
export declare function hmacSHA512Verify(key: string | Uint8Array, message: string | Uint8Array, signatureHex: string): boolean;
/**
 * Encrypt plaintext with AES-256-GCM.
 *
 * @param key - 32-byte key (Uint8Array or hex string)
 * @param plaintext - Data to encrypt
 * @returns Buffer containing nonce(12) || ciphertext || tag(16)
 */
export declare function aesGcmEncrypt(key: Uint8Array | string, plaintext: Uint8Array | string): Uint8Array;
/**
 * Decrypt AES-256-GCM ciphertext.
 *
 * @param key - 32-byte key
 * @param data - nonce(12) || ciphertext || tag(16)
 * @returns Decrypted plaintext
 */
export declare function aesGcmDecrypt(key: Uint8Array | string, data: Uint8Array): Uint8Array;
/**
 * Derive a key using PBKDF2-HMAC-SHA256 (synchronous).
 *
 * @param password - Password bytes or string
 * @param salt - Salt bytes or string (should be >=16 random bytes)
 * @param iterations - Number of iterations (recommended >=100000)
 * @param keyLength - Output key length in bytes (default 32)
 * @returns Derived key bytes
 */
export declare function pbkdf2Derive(password: string | Uint8Array, salt: string | Uint8Array, iterations?: number, keyLength?: number): Uint8Array;
/**
 * Verify a password against a PBKDF2-derived key.
 */
export declare function pbkdf2Verify(password: string | Uint8Array, salt: string | Uint8Array, iterations: number, expectedKey: Uint8Array): boolean;
/**
 * Generate cryptographically secure random bytes.
 */
export declare function secureRandomBytes(n: number): Uint8Array;
/**
 * Generate a URL-safe random token (base64url-encoded, no padding).
 *
 * @param nBytes - Number of random bytes (default 32 -> 43-char token)
 */
export declare function randomToken(nBytes?: number): string;
/**
 * Generate a random hex token.
 *
 * @param nBytes - Number of random bytes (default 32 -> 64-char hex)
 */
export declare function randomHex(nBytes?: number): string;
/**
 * Generate an Ed25519 keypair.
 *
 * @returns Object with `privateKey` (32 bytes) and `publicKey` (32 bytes)
 */
export declare function ed25519Keygen(): {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
};
/**
 * Sign a message with an Ed25519 private key.
 *
 * @param privateKey - 32-byte raw private key
 * @param message - Message to sign
 * @returns 64-byte signature
 */
export declare function ed25519Sign(privateKey: Uint8Array, message: Uint8Array | string): Uint8Array;
/**
 * Verify an Ed25519 signature.
 *
 * @param publicKey - 32-byte raw public key
 * @param message - Original message
 * @param signature - 64-byte signature
 * @returns true if valid
 */
export declare function ed25519Verify(publicKey: Uint8Array, message: Uint8Array | string, signature: Uint8Array): boolean;
//# sourceMappingURL=crypto.d.ts.map