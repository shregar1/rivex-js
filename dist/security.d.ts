import type { Context } from './types.js';
/** Credentials extracted from an Authorization header. */
export interface HTTPAuthorizationCredentials {
    readonly scheme: string;
    readonly credentials: string;
}
/**
 * Extracts an API key from a named request header.
 * Typically used with `Depends()` for route-level authentication.
 */
export declare class APIKeyHeader {
    readonly name: string;
    readonly autoError: boolean;
    readonly schemeName: string;
    readonly openApiScheme: Record<string, unknown>;
    constructor(name: string, options?: {
        autoError?: boolean;
        schemeName?: string;
    });
    /** Resolve the API key from the request context. */
    resolve(ctx: Context): string | null;
}
/**
 * Extracts Bearer credentials from the Authorization header.
 */
export declare class HTTPBearer {
    readonly autoError: boolean;
    readonly schemeName: string;
    readonly openApiScheme: Record<string, unknown>;
    constructor(options?: {
        autoError?: boolean;
        schemeName?: string;
    });
    /** Resolve bearer credentials from the request context. */
    resolve(ctx: Context): HTTPAuthorizationCredentials | null;
}
/**
 * OAuth2 password bearer flow. Extracts the bearer token from the
 * Authorization header.
 */
export declare class OAuth2PasswordBearer {
    readonly tokenUrl: string;
    readonly autoError: boolean;
    readonly schemeName: string;
    readonly openApiScheme: Record<string, unknown>;
    constructor(tokenUrl: string, options?: {
        autoError?: boolean;
        schemeName?: string;
    });
    /** Resolve the bearer token from the request context. */
    resolve(ctx: Context): string | null;
}
//# sourceMappingURL=security.d.ts.map