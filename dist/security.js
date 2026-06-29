import { HTTPException } from './exceptions.js';
/**
 * Extracts an API key from a named request header.
 * Typically used with `Depends()` for route-level authentication.
 */
export class APIKeyHeader {
    name;
    autoError;
    schemeName;
    openApiScheme;
    constructor(name, options) {
        this.name = name;
        this.autoError = options?.autoError ?? true;
        this.schemeName = options?.schemeName ?? 'APIKeyHeader';
        this.openApiScheme = { type: 'apiKey', in: 'header', name };
    }
    /** Resolve the API key from the request context. */
    resolve(ctx) {
        const value = ctx.request.header(this.name);
        if (value === undefined && this.autoError) {
            throw new HTTPException(403, 'Not authenticated');
        }
        return value ?? null;
    }
}
/**
 * Extracts Bearer credentials from the Authorization header.
 */
export class HTTPBearer {
    autoError;
    schemeName;
    openApiScheme;
    constructor(options) {
        this.autoError = options?.autoError ?? true;
        this.schemeName = options?.schemeName ?? 'HTTPBearer';
        this.openApiScheme = { type: 'http', scheme: 'bearer' };
    }
    /** Resolve bearer credentials from the request context. */
    resolve(ctx) {
        const authorization = ctx.request.header('authorization');
        if (!authorization) {
            if (this.autoError) {
                throw new HTTPException(403, 'Not authenticated');
            }
            return null;
        }
        const spaceIndex = authorization.indexOf(' ');
        if (spaceIndex === -1) {
            if (this.autoError) {
                throw new HTTPException(403, 'Invalid authorization header');
            }
            return null;
        }
        const scheme = authorization.slice(0, spaceIndex);
        const credentials = authorization.slice(spaceIndex + 1);
        if (!scheme || !credentials) {
            if (this.autoError) {
                throw new HTTPException(403, 'Invalid authorization header');
            }
            return null;
        }
        return { scheme, credentials };
    }
}
/**
 * OAuth2 password bearer flow. Extracts the bearer token from the
 * Authorization header.
 */
export class OAuth2PasswordBearer {
    tokenUrl;
    autoError;
    schemeName;
    openApiScheme;
    constructor(tokenUrl, options) {
        this.tokenUrl = tokenUrl;
        this.autoError = options?.autoError ?? true;
        this.schemeName = options?.schemeName ?? 'OAuth2PasswordBearer';
        this.openApiScheme = {
            type: 'oauth2',
            flows: { password: { tokenUrl, scopes: {} } },
        };
    }
    /** Resolve the bearer token from the request context. */
    resolve(ctx) {
        const authorization = ctx.request.header('authorization');
        if (!authorization) {
            if (this.autoError) {
                throw new HTTPException(401, 'Not authenticated', {
                    'WWW-Authenticate': 'Bearer',
                });
            }
            return null;
        }
        const spaceIndex = authorization.indexOf(' ');
        if (spaceIndex === -1) {
            if (this.autoError) {
                throw new HTTPException(401, 'Invalid authentication credentials', {
                    'WWW-Authenticate': 'Bearer',
                });
            }
            return null;
        }
        const scheme = authorization.slice(0, spaceIndex);
        const token = authorization.slice(spaceIndex + 1);
        if (scheme.toLowerCase() !== 'bearer' || !token) {
            if (this.autoError) {
                throw new HTTPException(401, 'Invalid authentication credentials', {
                    'WWW-Authenticate': 'Bearer',
                });
            }
            return null;
        }
        return token;
    }
}
//# sourceMappingURL=security.js.map