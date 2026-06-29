/**
 * Compression utilities — gzip, brotli.
 *
 * Uses Node.js built-in `node:zlib` (no native dependencies).
 */

import {
  gzipSync,
  gunzipSync,
  brotliCompressSync,
  brotliDecompressSync,
  constants,
} from "node:zlib";

// ── Gzip ────────────────────────────────────────────────────────────

/**
 * Compress data with gzip.
 *
 * @param data Raw data to compress
 * @param level Compression level 1–9 (default: 6)
 */
export function gzipCompress(data: Buffer, level?: number): Buffer {
  return gzipSync(data, {
    level: level ?? constants.Z_DEFAULT_COMPRESSION,
  });
}

/**
 * Decompress gzip data.
 */
export function gzipDecompress(data: Buffer): Buffer {
  return gunzipSync(data);
}

// ── Brotli ──────────────────────────────────────────────────────────

/**
 * Compress data with Brotli.
 *
 * @param data Raw data to compress
 * @param quality Compression quality 0–11 (default: 11)
 */
export function brotliCompress(data: Buffer, quality?: number): Buffer {
  return brotliCompressSync(data, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: quality ?? constants.BROTLI_DEFAULT_QUALITY,
    },
  });
}

/**
 * Decompress Brotli data.
 */
export function brotliDecompress(data: Buffer): Buffer {
  return brotliDecompressSync(data);
}
