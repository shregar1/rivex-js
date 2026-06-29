/**
 * File/IO utilities — checksums, ZIP, PDF text extraction, MIME sniffing, image dimensions.
 *
 * Uses Node.js built-in `node:crypto` and `node:zlib` (no native dependencies).
 */
/**
 * Compute MD5 hex digest of data.
 */
export declare function checksumMd5(data: Buffer): string;
/**
 * Compute SHA-256 hex digest of data.
 */
export declare function checksumSha256(data: Buffer): string;
/**
 * Compute CRC32 checksum of data.
 */
export declare function checksumCrc32(data: Buffer): number;
interface ZipEntry {
    path: string;
    data: Buffer;
}
/**
 * Create a minimal ZIP archive from an array of entries.
 *
 * Uses DEFLATE compression via Node.js built-in zlib.
 * Implements the ZIP file format (local file headers + central directory + end record).
 */
export declare function zipCreate(entries: ZipEntry[]): Buffer;
/**
 * Extract entries from a ZIP archive.
 *
 * Parses the ZIP file format and decompresses DEFLATE-compressed entries.
 *
 * @returns Array of {path, data} entries
 */
export declare function zipExtract(data: Buffer): ZipEntry[];
/**
 * Extract text from a PDF buffer.
 *
 * Performs simple extraction of parenthesized text strings from the PDF.
 * Handles basic escape sequences and hex strings.
 * This is not a full PDF parser — it works best with simple, text-based PDFs.
 */
export declare function pdfExtractText(data: Buffer): string;
/**
 * Detect MIME type from magic bytes in binary data.
 *
 * @returns Detected MIME type, or null if unknown
 */
export declare function sniffMime(data: Buffer): string | null;
/**
 * Parse image dimensions from PNG, JPEG, or GIF headers.
 *
 * @returns {width, height} or null if the format is not recognized
 */
export declare function imageDimensions(data: Buffer): {
    width: number;
    height: number;
} | null;
export {};
//# sourceMappingURL=file_io.d.ts.map