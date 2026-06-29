import type { Context } from './types.js';
import { HTTPException } from './exceptions.js';

/** Credentials extracted from an Authorization header. */
export interface HTTPAuthorizationCredentials {
  readonly scheme: string;
  readonly credentials: string;
}

/**
 * Extracts an API key from a named request header.
 * Typically used with `Depends()` for route-level authentication.
 */
export class APIKeyHeader {
  readonly name: string;
  readonly autoError: boolean;
  readonly schemeName: string;
  readonly openApiScheme: Record<string, unknown>;

  constructor(
    name: string,
    options?: { autoError?: boolean; schemeName?: string },
  ) {
    this.name = name;
    this.autoError = options?.autoError ?? true;
    this.schemeName = options?.schemeName ?? 'APIKeyHeader';
    this.openApiScheme = { type: 'apiKey', in: 'header', name };
  }

  /** Resolve the API key from the request context. */
  resolve(ctx: Context): string | null {
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
  readonly autoError: boolean;
  readonly schemeName: string;
  readonly openApiScheme: Record<string, unknown>;

  constructor(options?: { autoError?: boolean; schemeName?: string }) {
    this.autoError = options?.autoError ?? true;
    this.schemeName = options?.schemeName ?? 'HTTPBearer';
    this.openApiScheme = { type: 'http', scheme: 'bearer' };
  }

  /** Resolve bearer credentials from the request context. */
  resolve(ctx: Context): HTTPAuthorizationCredentials | null {
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
  readonly tokenUrl: string;
  readonly autoError: boolean;
  readonly schemeName: string;
  readonly openApiScheme: Record<string, unknown>;

  constructor(
    tokenUrl: string,
    options?: { autoError?: boolean; schemeName?: string },
  ) {
    this.tokenUrl = tokenUrl;
    this.autoError = options?.autoError ?? true;
    this.schemeName = options?.schemeName ?? 'OAuth2PasswordBearer';
    this.openApiScheme = {
      type: 'oauth2',
      flows: { password: { tokenUrl, scopes: {} } },
    };
  }

  /** Resolve the bearer token from the request context. */
  resolve(ctx: Context): string | null {
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
