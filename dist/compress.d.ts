/**
 * Compression utilities — gzip, brotli.
 *
 * Uses Node.js built-in `node:zlib` (no native dependencies).
 */
/**
 * Compress data with gzip.
 *
 * @param data Raw data to compress
 * @param level Compression level 1–9 (default: 6)
 */
export declare function gzipCompress(data: Buffer, level?: number): Buffer;
/**
 * Decompress gzip data.
 */
export declare function gzipDecompress(data: Buffer): Buffer;
/**
 * Compress data with Brotli.
 *
 * @param data Raw data to compress
 * @param quality Compression quality 0–11 (default: 11)
 */
export declare function brotliCompress(data: Buffer, quality?: number): Buffer;
/**
 * Decompress Brotli data.
 */
export declare function brotliDecompress(data: Buffer): Buffer;
//# sourceMappingURL=compress.d.ts.map