/**
 * Middleware utilities — rate limiter, IP/CIDR, ETag, body hash, content negotiation.
 *
 * Pure Node.js implementations (no native dependencies).
 */
/**
 * A concurrent token-bucket rate limiter.
 */
export declare class RateLimiter {
    private rate;
    private burst;
    private buckets;
    /**
     * @param rate Tokens refilled per second
     * @param burst Maximum bucket capacity
     */
    constructor(rate: number, burst: number);
    /** Check if 1 token is available for key. */
    check(key: string): boolean;
    /** Check if n tokens are available for key. */
    checkN(key: string, n: number): boolean;
    /** Get remaining tokens for key (without consuming). */
    remaining(key: string): number;
    /** Seconds until 1 token is available (0 if already available). */
    retryAfter(key: string): number;
    /** Reset bucket for key. */
    reset(key: string): void;
    /** Clear all buckets. */
    clear(): void;
    /** Number of tracked keys. */
    get size(): number;
}
/**
 * Check if an IP address is within a CIDR range.
 */
export declare function ipInCidr(ip: string, cidr: string): boolean;
/**
 * Check if IP matches any CIDR in a list.
 */
export declare function ipInCidrs(ip: string, cidrs: string[]): boolean;
/**
 * Check if an IP is a private/reserved address.
 */
export declare function isPrivateIp(ip: string): boolean;
/**
 * Generate a CRC32-based ETag.
 */
export declare function etagCrc32(data: Buffer | Uint8Array): string;
/**
 * Generate a weak CRC32-based ETag.
 */
export declare function etagWeak(data: Buffer | Uint8Array): string;
/**
 * Generate a SHA-256-based strong ETag (16 hex chars).
 */
export declare function etagStrong(data: Buffer | Uint8Array): string;
/**
 * Check if two ETags match (RFC 7232).
 */
export declare function etagMatch(etag1: string, etag2: string, strong?: boolean): boolean;
/**
 * Compute SHA-256 hex digest of data.
 */
export declare function bodySha256(data: Buffer | Uint8Array): string;
/**
 * Verify SHA-256 hex digest of data (constant-time).
 */
export declare function bodySha256Verify(data: Buffer | Uint8Array, expectedHex: string): boolean;
/**
 * Compute webhook signature: sha256=<HMAC-SHA256 hex>.
 */
export declare function webhookSign(secret: Buffer | Uint8Array, body: Buffer | Uint8Array): string;
/**
 * Verify a webhook signature (constant-time).
 */
export declare function webhookVerify(secret: Buffer | Uint8Array, body: Buffer | Uint8Array, signature: string): boolean;
interface AcceptItem {
    type: string;
    quality: number;
}
/**
 * Parse an Accept header into sorted (type, quality) pairs.
 */
export declare function parseAccept(header: string): AcceptItem[];
/**
 * Negotiate the best content type from available options.
 */
export declare function negotiateContentType(acceptHeader: string, available: string[]): string | null;
/**
 * Parse an Accept-Language header.
 */
export declare function parseAcceptLanguage(header: string): AcceptItem[];
/**
 * Negotiate the best language from available options.
 */
export declare function negotiateLanguage(acceptHeader: string, available: string[]): string | null;
export {};
//# sourceMappingURL=mw.d.ts.map