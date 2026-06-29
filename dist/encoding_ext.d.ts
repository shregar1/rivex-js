/**
 * Encoding extensions — query strings, cookies, JWT.
 *
 * Pure Node.js implementations (no native dependencies).
 */
/**
 * Parse a URL query string into a key-value record.
 *
 * @param query Query string (with or without leading `?`)
 */
export declare function parseQueryString(query: string): Record<string, string>;
/**
 * Build a URL query string from a key-value record.
 *
 * @returns Query string without leading `?`
 */
export declare function buildQueryString(params: Record<string, string>): string;
/**
 * Parse a Cookie header string into key-value pairs.
 */
export declare function parseCookies(cookie: string): Record<string, string>;
/**
 * Build a Set-Cookie header value.
 */
export declare function buildSetCookie(name: string, value: string, options?: {
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
}): string;
/**
 * Encode a JWT token using HS256 (HMAC-SHA256).
 *
 * @param payload JSON-serializable object for the JWT claims
 * @param secret Signing secret
 * @returns Encoded JWT string (header.payload.signature)
 */
export declare function jwtEncode(payload: object, secret: string): string;
/**
 * Decode and verify a JWT token using HS256 (HMAC-SHA256).
 *
 * @param token JWT string
 * @param secret Signing secret
 * @returns Decoded payload object, or null if verification fails
 */
export declare function jwtDecode(token: string, secret: string): object | null;
//# sourceMappingURL=encoding_ext.d.ts.map