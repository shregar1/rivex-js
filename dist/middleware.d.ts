import type { Request } from './request.js';
import type { Response } from './response.js';
/** High-level middleware function operating on Request/Response objects. */
export type MiddlewareFunc = (request: Request, next: () => Promise<Response>) => Promise<Response>;
/**
 * Interface for class-based middleware. Implementations override
 * `process()` to intercept request/response flow.
 */
export interface Middleware {
    process(request: Request, next: () => Promise<Response>): Promise<Response>;
}
/** Constructor type for class-based middleware. */
export interface MiddlewareClass {
    new (...args: unknown[]): Middleware;
}
export type RawMiddlewareFunc = (requestData: RawRequestData, callNext: (data: RawRequestData) => Promise<RawResponseData>) => Promise<RawResponseData>;
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
export declare class CORSMiddleware implements Middleware {
    readonly allowOrigins: string[];
    readonly allowMethods: string[];
    readonly allowHeaders: string[];
    readonly allowCredentials: boolean;
    readonly maxAge: number;
    constructor(options?: CORSOptions);
    process(_request: Request, _next: () => Promise<Response>): Promise<Response>;
    /** Process at the raw request/response level (used internally). */
    processRaw(requestData: RawRequestData, callNext: (data: RawRequestData) => Promise<RawResponseData>): Promise<RawResponseData>;
    private _corsHeaders;
}
export interface GZipOptions {
    minimumSize?: number;
}
/**
 * GZip compression middleware. Compresses response bodies that exceed
 * the minimum size threshold when the client supports gzip encoding.
 */
export declare class GZipMiddleware implements Middleware {
    readonly minimumSize: number;
    constructor(options?: GZipOptions);
    process(_request: Request, _next: () => Promise<Response>): Promise<Response>;
    processRaw(requestData: RawRequestData, callNext: (data: RawRequestData) => Promise<RawResponseData>): Promise<RawResponseData>;
}
export interface RequestIdOptions {
    headerName?: string;
}
/**
 * Adds a unique request ID to every response. If the incoming request
 * already has the header, its value is forwarded.
 */
export declare class RequestIdMiddleware implements Middleware {
    readonly headerName: string;
    constructor(options?: RequestIdOptions);
    process(_request: Request, _next: () => Promise<Response>): Promise<Response>;
    processRaw(requestData: RawRequestData, callNext: (data: RawRequestData) => Promise<RawResponseData>): Promise<RawResponseData>;
}
export interface TrustedHostOptions {
    allowedHosts?: string[];
}
/**
 * Rejects requests whose Host header is not in the allowed list.
 */
export declare class TrustedHostMiddleware implements Middleware {
    readonly allowedHosts: Set<string>;
    constructor(options?: TrustedHostOptions);
    process(_request: Request, _next: () => Promise<Response>): Promise<Response>;
    processRaw(requestData: RawRequestData, callNext: (data: RawRequestData) => Promise<RawResponseData>): Promise<RawResponseData>;
}
/**
 * Adapt a raw middleware function (operating on raw dicts) from a built-in
 * middleware class that exposes a `processRaw` method.
 */
export declare function toRawMiddleware(mw: Middleware): RawMiddlewareFunc | null;
//# sourceMappingURL=middleware.d.ts.map