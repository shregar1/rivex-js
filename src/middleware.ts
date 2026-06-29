import { randomUUID } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import type { Request } from './request.js';
import type { Response } from './response.js';

// ── Middleware types ──

/** High-level middleware function operating on Request/Response objects. */
export type MiddlewareFunc = (
  request: Request,
  next: () => Promise<Response>,
) => Promise<Response>;

// ── Middleware interface ──

/**
 * Interface for class-based middleware. Implementations override
 * `process()` to intercept request/response flow.
 */
export interface Middleware {
  process(
    request: Request,
    next: () => Promise<Response>,
  ): Promise<Response>;
}

/** Constructor type for class-based middleware. */
export interface MiddlewareClass {
  new (...args: unknown[]): Middleware;
}

// ── Internal raw middleware interface ──
// Middleware that operates on the raw request/response dicts used by the
// native layer. Class middleware is adapted into this form by the application.

export type RawMiddlewareFunc = (
  requestData: RawRequestData,
  callNext: (data: RawRequestData) => Promise<RawResponseData>,
) => Promise<RawResponseData>;

export interface RawRequestData {
  method: string;
  path: string;
  headers: Array<[string, string]>;
  body: Buffer;
  queryString: string;
  pathParams: Record<string, string>;
  clientHost?: string;
  clientPort?: number;
}

export interface RawResponseData {
  status: number;
  headers: Array<[string, string]>;
  body: Buffer;
  bodyJson?: unknown;
}

// ── Built-in middleware implementations ──

export interface CORSOptions {
  allowOrigins?: string[];
  allowMethods?: string[];
  allowHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

/**
 * Cross-Origin Resource Sharing middleware. Adds the appropriate CORS
 * headers to every response and handles preflight OPTIONS requests.
 */
export class CORSMiddleware implements Middleware {
  readonly allowOrigins: string[];
  readonly allowMethods: string[];
  readonly allowHeaders: string[];
  readonly allowCredentials: boolean;
  readonly maxAge: number;

  constructor(options: CORSOptions = {}) {
    this.allowOrigins = options.allowOrigins ?? ['*'];
    this.allowMethods = options.allowMethods ?? [
      'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS',
    ];
    this.allowHeaders = options.allowHeaders ?? ['*'];
    this.allowCredentials = options.allowCredentials ?? false;
    this.maxAge = options.maxAge ?? 600;
  }

  async process(
    _request: Request,
    _next: () => Promise<Response>,
  ): Promise<Response> {
    // This is a placeholder — the real processing happens at the raw level.
    // See CORSMiddleware.processRaw() used internally by the application.
    return _next();
  }

  /** Process at the raw request/response level (used internally). */
  async processRaw(
    requestData: RawRequestData,
    callNext: (data: RawRequestData) => Promise<RawResponseData>,
  ): Promise<RawResponseData> {
    const origin = getHeaderValue(requestData.headers, 'origin');

    if (requestData.method === 'OPTIONS') {
      return {
        status: 204,
        headers: this._corsHeaders(origin),
        body: Buffer.alloc(0),
      };
    }

    const response = await callNext(requestData);
    response.headers = [
      ...response.headers,
      ...this._corsHeaders(origin),
    ];
    return response;
  }

  private _corsHeaders(requestOrigin?: string): Array<[string, string]> {
    let allowedOrigin: string;
    if (this.allowOrigins.includes('*')) {
      allowedOrigin = this.allowCredentials
        ? (requestOrigin ?? '*')
        : '*';
    } else if (requestOrigin && this.allowOrigins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    } else {
      allowedOrigin = this.allowOrigins[0] ?? '';
    }

    const headers: Array<[string, string]> = [
      ['access-control-allow-origin', allowedOrigin],
      ['access-control-allow-methods', this.allowMethods.join(', ')],
      ['access-control-allow-headers', this.allowHeaders.join(', ')],
      ['access-control-max-age', String(this.maxAge)],
    ];

    if (this.allowCredentials) {
      headers.push(['access-control-allow-credentials', 'true']);
    }
    if (!this.allowOrigins.includes('*')) {
      headers.push(['vary', 'Origin']);
    }
    return headers;
  }
}

export interface GZipOptions {
  minimumSize?: number;
}

/**
 * GZip compression middleware. Compresses response bodies that exceed
 * the minimum size threshold when the client supports gzip encoding.
 */
export class GZipMiddleware implements Middleware {
  readonly minimumSize: number;

  constructor(options: GZipOptions = {}) {
    this.minimumSize = options.minimumSize ?? 500;
  }

  async process(
    _request: Request,
    _next: () => Promise<Response>,
  ): Promise<Response> {
    return _next();
  }

  async processRaw(
    requestData: RawRequestData,
    callNext: (data: RawRequestData) => Promise<RawResponseData>,
  ): Promise<RawResponseData> {
    const response = await callNext(requestData);
    const body = response.body;
    if (body.length < this.minimumSize) return response;

    const acceptEncoding = getHeaderValue(requestData.headers, 'accept-encoding') ?? '';
    if (!acceptEncoding.toLowerCase().includes('gzip')) return response;

    const compressed = gzipSync(body);
    if (compressed.length >= body.length) return response;

    response.body = compressed;
    response.headers = [
      ...response.headers.filter(
        ([k]) => k.toLowerCase() !== 'content-length',
      ),
      ['content-encoding', 'gzip'],
      ['vary', 'Accept-Encoding'],
    ];
    return response;
  }
}

export interface RequestIdOptions {
  headerName?: string;
}

/**
 * Adds a unique request ID to every response. If the incoming request
 * already has the header, its value is forwarded.
 */
export class RequestIdMiddleware implements Middleware {
  readonly headerName: string;

  constructor(options: RequestIdOptions = {}) {
    this.headerName = options.headerName ?? 'x-request-id';
  }

  async process(
    _request: Request,
    _next: () => Promise<Response>,
  ): Promise<Response> {
    return _next();
  }

  async processRaw(
    requestData: RawRequestData,
    callNext: (data: RawRequestData) => Promise<RawResponseData>,
  ): Promise<RawResponseData> {
    const incomingId = getHeaderValue(requestData.headers, this.headerName);
    const requestId = incomingId ?? randomUUID().replace(/-/g, '');
    const response = await callNext(requestData);
    response.headers = [...response.headers, [this.headerName, requestId]];
    return response;
  }
}

export interface TrustedHostOptions {
  allowedHosts?: string[];
}

/**
 * Rejects requests whose Host header is not in the allowed list.
 */
export class TrustedHostMiddleware implements Middleware {
  readonly allowedHosts: Set<string>;

  constructor(options: TrustedHostOptions = {}) {
    this.allowedHosts = new Set(
      (options.allowedHosts ?? ['*']).map((h) => h.toLowerCase()),
    );
  }

  async process(
    _request: Request,
    _next: () => Promise<Response>,
  ): Promise<Response> {
    return _next();
  }

  async processRaw(
    requestData: RawRequestData,
    callNext: (data: RawRequestData) => Promise<RawResponseData>,
  ): Promise<RawResponseData> {
    if (this.allowedHosts.has('*')) {
      return callNext(requestData);
    }

    const hostHeader = getHeaderValue(requestData.headers, 'host') ?? '';
    const host = hostHeader.split(':')[0].toLowerCase();

    if (!this.allowedHosts.has(host)) {
      return {
        status: 400,
        headers: [['content-type', 'application/json']],
        body: Buffer.from(JSON.stringify({ detail: 'Invalid host header' })),
      };
    }

    return callNext(requestData);
  }
}

// ── Helpers ──

function getHeaderValue(
  headers: Array<[string, string]>,
  name: string,
): string | undefined {
  const target = name.toLowerCase();
  for (const [k, v] of headers) {
    if (k.toLowerCase() === target) return v;
  }
  return undefined;
}

/**
 * Adapt a raw middleware function (operating on raw dicts) from a built-in
 * middleware class that exposes a `processRaw` method.
 */
export function toRawMiddleware(
  mw: Middleware,
): RawMiddlewareFunc | null {
  const processRaw = (mw as unknown as { processRaw?: RawMiddlewareFunc }).processRaw;
  if (typeof processRaw === 'function') {
    return processRaw.bind(mw) as RawMiddlewareFunc;
  }
  return null;
}
