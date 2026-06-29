/**
 * Protocol utilities — URL parsing/building, MIME detection, HTTP headers, GraphQL.
 *
 * Pure Node.js implementations (no native dependencies).
 */
/**
 * Parse raw HTTP headers (as received on the wire) into an array of [name, value] tuples.
 *
 * Each header line is separated by CRLF. The first status line (if present) is skipped.
 * Continuation lines (starting with whitespace) are folded into the previous header.
 */
export declare function parseRawHeaders(raw: string): Array<[string, string]>;
export interface ParsedUrl {
    scheme: string;
    host: string;
    port: number | null;
    path: string;
    query: string;
    fragment: string;
    username: string;
}
/**
 * Parse a URL string into its components.
 */
export declare function parseUrl(urlStr: string): ParsedUrl;
/**
 * Build a URL string from its components.
 */
export declare function buildUrl(components: {
    scheme?: string;
    host: string;
    port?: number;
    path?: string;
    query?: string;
    fragment?: string;
}): string;
/**
 * Resolve a relative URL against a base URL.
 */
export declare function resolveUrl(base: string, relative: string): string;
/**
 * Detect MIME type from magic bytes in binary data.
 *
 * @returns Detected MIME type, or null if unknown.
 */
export declare function sniffMimeType(data: Uint8Array | Buffer): string | null;
/**
 * Get MIME type from a file extension.
 *
 * @param ext File extension (with or without leading dot)
 * @returns MIME type string, or null if unknown
 */
export declare function mimeFromExtension(ext: string): string | null;
/**
 * Get a file extension for a MIME type.
 *
 * @param mime MIME type string
 * @returns File extension (without dot), or null if unknown
 */
export declare function extensionFromMime(mime: string): string | null;
/**
 * Parse a simple GraphQL query string into an AST-like object.
 *
 * Identifies query/mutation/subscription/fragment definitions,
 * field selections, arguments, aliases, and variable definitions.
 */
export declare function parseGraphQL(query: string): object;
/**
 * Validate a GraphQL query string.
 *
 * Checks basic structural validity:
 * - Balanced braces and parentheses
 * - Valid operation types (query, mutation, subscription, fragment)
 * - Non-empty selection sets
 *
 * @returns true if structurally valid, false otherwise
 */
export declare function validateGraphQL(query: string): boolean;
/**
 * Extract text from a PDF (simple parenthesized string extraction).
 *
 * This is a lightweight extractor that reads text from parenthesized
 * strings in the PDF content stream. It does not handle all PDF
 * encodings or compressed streams.
 */
export declare function pdfExtractText(data: Buffer): string;
/**
 * Get image dimensions from PNG/JPEG/GIF/BMP headers.
 *
 * @returns `{ width, height }` or `null` if format is unrecognised.
 */
export declare function imageDimensions(data: Buffer): {
    width: number;
    height: number;
} | null;
//# sourceMappingURL=protocol.d.ts.map