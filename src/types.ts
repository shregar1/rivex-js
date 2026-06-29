import type { Request } from './request.js';
import type { Response } from './response.js';

/**
 * Context object passed to every route handler. Provides access to the
 * request, response helpers, path parameters, and per-request state.
 */
export interface Context {
  /** The incoming HTTP request. */
  readonly request: Request;
  /** Path parameters extracted from the URL pattern. */
  readonly params: Record<string, string>;
  /** Per-request state store for sharing data between middleware and handlers. */
  readonly state: Map<string, unknown>;
}

/** A route handler function. May return any serialisable value or a Response. */
export type HandlerFunc = (ctx: Context) => unknown | Promise<unknown>;

/** Middleware function matching the (request, next) pattern. */
export type MiddlewareFunc = (
  request: Request,
  next: () => Promise<Response>,
) => Promise<Response>;

/** An exception handler receives the context and the thrown error. */
export type ExceptionHandler<T extends Error = Error> = (
  ctx: Context,
  error: T,
) => unknown | Promise<unknown>;

/** Options applied to an individual route registration. */
export interface RouteOptions {
  statusCode?: number;
  responseModel?: unknown;
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
  includeInSchema?: boolean;
  openApiExtra?: Record<string, unknown>;
}

/** Internal record describing a single registered route. */
export interface RouteRecord {
  method: string;
  path: string;
  handler: HandlerFunc;
  options: Required<
    Pick<RouteOptions, 'statusCode' | 'tags' | 'deprecated' | 'includeInSchema'>
  > &
    Omit<
      RouteOptions,
      'statusCode' | 'tags' | 'deprecated' | 'includeInSchema'
    >;
}

/** Raw response shape exchanged with the native layer. */
export interface RawResponse {
  status: number;
  headers: Array<[string, string]>;
  body: Buffer;
}

/** Raw request shape received from the native layer. */
export interface RawRequest {
  method: string;
  path: string;
  headers: Array<[string, string]>;
  body: Buffer;
  queryString: string;
  pathParams: Record<string, string>;
  clientHost?: string;
  clientPort?: number;
}
