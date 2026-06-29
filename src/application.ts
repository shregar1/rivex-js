import type {
  Context,
  ExceptionHandler,
  HandlerFunc,
  RouteOptions,
  RouteRecord,
} from './types.js';
import type {
  Middleware,
  MiddlewareClass,
  MiddlewareFunc,
  RawMiddlewareFunc,
  RawRequestData,
  RawResponseData,
} from './middleware.js';
import { toRawMiddleware, CORSMiddleware } from './middleware.js';
import { Router } from './router.js';
import { controllerToRouter } from './controller.js';
import type { Controller } from './controller.js';
import { Request } from './request.js';
import { Response } from './response.js';
import { StreamingResponse } from './response.js';
import { HTTPException } from './exceptions.js';
import { generateOpenAPI, generateSwaggerHTML } from './openapi.js';
import { createNativeServer } from './native/bindings.js';

// ── Configuration ──

export interface RivexOptions {
  title?: string;
  version?: string;
  description?: string;
  debug?: boolean;
  docsUrl?: string | null;
  openApiUrl?: string | null;
  openApiTags?: Array<{ name: string; description?: string }>;
  servers?: Array<{ url: string; description?: string }>;
  termsOfService?: string;
  contact?: Record<string, string>;
  licenseInfo?: Record<string, string>;
  lifespan?: (app: Rivex) => AsyncGenerator;
}

// ── Application ──

/**
 * The main Rivex application class. Register routes, middleware,
 * lifecycle hooks, and exception handlers, then call `run()` to start
 * the server.
 */
export class Rivex {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
  readonly debug: boolean;
  readonly docsUrl: string | null;
  readonly openApiUrl: string | null;
  readonly openApiTags?: Array<{ name: string; description?: string }>;
  readonly servers?: Array<{ url: string; description?: string }>;
  readonly termsOfService?: string;
  readonly contact?: Record<string, string>;
  readonly licenseInfo?: Record<string, string>;
  readonly lifespan?: (app: Rivex) => AsyncGenerator;

  /** Per-application state store (shared across requests). */
  state: Record<string, unknown> = {};

  /** @internal */
  _routes: RouteRecord[] = [];
  /** @internal */
  _middleware: Array<{ instance: Middleware; options: Record<string, unknown> }> = [];
  /** @internal */
  _rawMiddleware: RawMiddlewareFunc[] = [];
  /** @internal */
  _startupHooks: Array<() => void | Promise<void>> = [];
  /** @internal */
  _shutdownHooks: Array<() => void | Promise<void>> = [];
  /** @internal */
  _exceptionHandlers: Map<
    new (...args: unknown[]) => Error,
    ExceptionHandler
  > = new Map();

  constructor(options?: RivexOptions) {
    this.title = options?.title ?? 'Rivex';
    this.version = options?.version ?? '0.1.0';
    this.description = options?.description;
    this.debug = options?.debug ?? false;
    this.docsUrl = options?.docsUrl === undefined ? '/docs' : options.docsUrl;
    this.openApiUrl =
      options?.openApiUrl === undefined ? '/openapi.json' : options.openApiUrl;
    this.openApiTags = options?.openApiTags;
    this.servers = options?.servers;
    this.termsOfService = options?.termsOfService;
    this.contact = options?.contact;
    this.licenseInfo = options?.licenseInfo;
    this.lifespan = options?.lifespan;
  }

  // ── HTTP method shorthands ──

  get(path: string, handler: HandlerFunc, options?: RouteOptions): this {
    return this._addRoute('GET', path, handler, options);
  }

  post(path: string, handler: HandlerFunc, options?: RouteOptions): this {
    return this._addRoute('POST', path, handler, options);
  }

  put(path: string, handler: HandlerFunc, options?: RouteOptions): this {
    return this._addRoute('PUT', path, handler, options);
  }

  delete(path: string, handler: HandlerFunc, options?: RouteOptions): this {
    return this._addRoute('DELETE', path, handler, options);
  }

  patch(path: string, handler: HandlerFunc, options?: RouteOptions): this {
    return this._addRoute('PATCH', path, handler, options);
  }

  head(path: string, handler: HandlerFunc, options?: RouteOptions): this {
    return this._addRoute('HEAD', path, handler, options);
  }

  options(path: string, handler: HandlerFunc, options?: RouteOptions): this {
    return this._addRoute('OPTIONS', path, handler, options);
  }

  // ── Router / Controller inclusion ──

  /** Include a router's routes into this application. */
  includeRouter(
    router: Router,
    options?: { prefix?: string; tags?: string[] },
  ): this {
    const prefix = options?.prefix ?? '';
    const tags = options?.tags ?? [];

    for (const record of router._routes) {
      const mergedPath = joinPaths(prefix, record.path);
      this._routes.push({
        method: record.method,
        path: mergedPath,
        handler: record.handler,
        options: {
          ...record.options,
          tags: [...tags, ...record.options.tags],
        },
      });
    }
    return this;
  }

  /** Include a controller class's routes. */
  includeController(
    controller: typeof Controller | Controller,
    options?: { prefix?: string; tags?: string[] },
  ): this {
    const router = controllerToRouter(controller);
    const prefix = options?.prefix ?? '';
    const tags = options?.tags ?? [];

    for (const record of router._routes) {
      const mergedPath = joinPaths(prefix, record.path);
      this._routes.push({
        method: record.method,
        path: mergedPath,
        handler: record.handler,
        options: {
          ...record.options,
          tags: [...tags, ...record.options.tags],
        },
      });
    }
    return this;
  }

  // ── Middleware ──

  /**
   * Add a class-based middleware. Instantiates the class with the provided
   * options and adds it to the middleware stack.
   */
  use(middlewareCls: MiddlewareClass, options?: Record<string, unknown>): this {
    const instance = new middlewareCls(options ?? {});
    this._middleware.push({ instance, options: options ?? {} });

    // If the middleware has a processRaw method, use it for raw-level processing
    const rawFn = toRawMiddleware(instance);
    if (rawFn) {
      this._rawMiddleware.push(rawFn);
    }

    return this;
  }

  /**
   * Register a function-based middleware using the `@app.middleware("http")`
   * pattern from FastAPI.
   */
  middleware(
    type: 'http',
    handler: MiddlewareFunc,
  ): this {
    if (type !== 'http') {
      throw new Error(
        `Unsupported middleware type "${type}". Only "http" is supported.`,
      );
    }

    // Wrap the high-level middleware function into a raw middleware
    const rawMiddleware: RawMiddlewareFunc = async (
      requestData: RawRequestData,
      callNext: (data: RawRequestData) => Promise<RawResponseData>,
    ): Promise<RawResponseData> => {
      const request = Request._fromRaw({
        method: requestData.method,
        path: requestData.path,
        headers: requestData.headers,
        body: requestData.body,
        queryString: requestData.queryString,
        pathParams: requestData.pathParams,
        clientHost: requestData.clientHost,
        clientPort: requestData.clientPort,
      });

      const nextFn = async (): Promise<Response> => {
        const rawResp = await callNext(requestData);
        return rawResponseToResponse(rawResp);
      };

      const response = await handler(request, nextFn);
      return responseToRawResponse(response);
    };

    this._rawMiddleware.push(rawMiddleware);
    return this;
  }

  // ── Lifecycle hooks ──

  /** Register a startup or shutdown event handler. */
  onEvent(
    event: 'startup' | 'shutdown',
    handler: () => void | Promise<void>,
  ): this {
    if (event === 'startup') {
      this._startupHooks.push(handler);
    } else {
      this._shutdownHooks.push(handler);
    }
    return this;
  }

  // ── Exception handlers ──

  /** Register a handler for a specific error class. */
  exceptionHandler<T extends Error>(
    errorClass: new (...args: unknown[]) => T,
    handler: ExceptionHandler<T>,
  ): this {
    this._exceptionHandlers.set(
      errorClass as new (...args: unknown[]) => Error,
      handler as ExceptionHandler,
    );
    return this;
  }

  // ── Server lifecycle ──

  /**
   * Start the HTTP server. Uses the native Rust runtime when available,
   * falling back to a clear error message if bindings are not installed.
   */
  async run(
    host: string = '127.0.0.1',
    port: number = 8000,
    _workers: number = 1,
  ): Promise<void> {
    // Run lifecycle hooks
    await this._runHooks(this._startupHooks);

    const server = createNativeServer();

    // Register all routes
    for (const record of this._routes) {
      const handler = this._buildHandler(record);
      const wrapped = this._applyRawMiddleware(handler);
      const napiCallback = toNapiCallback(wrapped);
      server.addRoute(record.method, record.path, napiCallback);
    }

    // Register CORS preflight handlers if CORS middleware is present
    const hasCors = this._middleware.some(
      ({ instance }) => instance instanceof CORSMiddleware,
    );
    if (hasCors) {
      const registeredPaths = new Set(this._routes.map((r) => r.path));
      for (const path of registeredPaths) {
        const noop = async (): Promise<RawResponseData> => ({
          status: 204,
          headers: [],
          body: Buffer.alloc(0),
        });
        const wrapped = this._applyRawMiddleware(noop);
        server.addRoute('OPTIONS', path, toNapiCallback(wrapped));
      }
    }

    // Register OpenAPI routes
    if (this.openApiUrl) {
      this._registerOpenAPIRoutes(server);
    }

    try {
      server.run(host, port);
    } finally {
      await this._runHooks(this._shutdownHooks);
    }
  }

  // ── Internal route building ──

  /** @internal */
  _buildHandler(
    record: RouteRecord,
  ): (requestData: RawRequestData) => Promise<RawResponseData> {
    const handler = record.handler;
    const defaultStatus = record.options.statusCode;
    const debug = this.debug;
    const exceptionHandlers = this._exceptionHandlers;

    return async (requestData: RawRequestData): Promise<RawResponseData> => {
      try {
        const request = Request._fromRaw({
          method: requestData.method,
          path: requestData.path,
          headers: requestData.headers,
          body: requestData.body,
          queryString: requestData.queryString,
          pathParams: requestData.pathParams,
          clientHost: requestData.clientHost,
          clientPort: requestData.clientPort,
        });

        const ctx: Context = {
          request,
          params: requestData.pathParams ?? {},
          state: new Map(),
        };

        const result = await handler(ctx);
        return normalizeResponse(result, defaultStatus);
      } catch (err) {
        if (err instanceof HTTPException) {
          // Check for custom exception handler
          const customHandler = findBestHandler(exceptionHandlers, err);
          if (customHandler) {
            const request = Request._fromRaw({
              method: requestData.method,
              path: requestData.path,
              headers: requestData.headers,
              body: requestData.body,
              queryString: requestData.queryString,
              pathParams: requestData.pathParams,
            });
            const ctx: Context = {
              request,
              params: requestData.pathParams ?? {},
              state: new Map(),
            };
            const result = await customHandler(ctx, err);
            return normalizeResponse(result, err.statusCode);
          }
          return httpExceptionResponse(err);
        }

        if (err instanceof Error) {
          const customHandler = findBestHandler(exceptionHandlers, err);
          if (customHandler) {
            const request = Request._fromRaw({
              method: requestData.method,
              path: requestData.path,
              headers: requestData.headers,
              body: requestData.body,
              queryString: requestData.queryString,
              pathParams: requestData.pathParams,
            });
            const ctx: Context = {
              request,
              params: requestData.pathParams ?? {},
              state: new Map(),
            };
            const result = await customHandler(ctx, err);
            return normalizeResponse(result, 500);
          }
        }

        const detail =
          debug && err instanceof Error
            ? err.message
            : 'Internal Server Error';
        return errorResponse(500, detail);
      }
    };
  }

  /** @internal Apply the raw middleware stack to a handler. */
  _applyRawMiddleware(
    handler: (requestData: RawRequestData) => Promise<RawResponseData>,
  ): (requestData: RawRequestData) => Promise<RawResponseData> {
    let wrapped = handler;

    // Apply middleware in reverse order so the first-registered runs first
    for (let i = this._rawMiddleware.length - 1; i >= 0; i--) {
      const mw = this._rawMiddleware[i];
      const inner = wrapped;
      wrapped = (requestData: RawRequestData) => mw(requestData, inner);
    }

    return wrapped;
  }

  // ── Internal helpers ──

  private _addRoute(
    method: string,
    path: string,
    handler: HandlerFunc,
    opts?: RouteOptions,
  ): this {
    this._routes.push({
      method,
      path,
      handler,
      options: {
        statusCode: opts?.statusCode ?? 200,
        tags: opts?.tags ?? [],
        deprecated: opts?.deprecated ?? false,
        includeInSchema: opts?.includeInSchema ?? true,
        summary: opts?.summary,
        description: opts?.description,
        operationId: opts?.operationId,
        responseModel: opts?.responseModel,
        openApiExtra: opts?.openApiExtra,
      },
    });
    return this;
  }

  private _registerOpenAPIRoutes(server: {
    addRoute(
      method: string,
      path: string,
      callback: (data: unknown) => Promise<unknown>,
    ): void;
  }): void {
    const spec = generateOpenAPI({
      title: this.title,
      version: this.version,
      description: this.description,
      routes: this._routes,
      openApiTags: this.openApiTags,
      servers: this.servers,
      termsOfService: this.termsOfService,
      contact: this.contact,
      licenseInfo: this.licenseInfo,
    });
    const specBytes = Buffer.from(JSON.stringify(spec, null, 2), 'utf-8');

    server.addRoute('GET', this.openApiUrl!, async () => ({
      status: 200,
      headers: [['content-type', 'application/json']],
      body: specBytes,
    }));

    if (this.docsUrl) {
      const html = generateSwaggerHTML(this.title, this.openApiUrl!);
      const htmlBytes = Buffer.from(html, 'utf-8');

      server.addRoute('GET', this.docsUrl, async () => ({
        status: 200,
        headers: [['content-type', 'text/html; charset=utf-8']],
        body: htmlBytes,
      }));
    }
  }

  /** @internal */
  async _runHooks(hooks: Array<() => void | Promise<void>>): Promise<void> {
    for (const hook of hooks) {
      await hook();
    }
  }
}

// ── Alias ──

/** FastAPI compatibility alias. */
export const FastAPI = Rivex;

// ── Response normalisation helpers ──

function normalizeResponse(
  result: unknown,
  statusCode: number,
): RawResponseData {
  // Response instances
  if (result instanceof StreamingResponse) {
    // Collect stream synchronously for the raw response
    const raw = result.toRaw();
    return {
      status: raw.status,
      headers: raw.headers,
      body: raw.body,
    };
  }

  if (result instanceof Response) {
    const raw = result.toRaw();
    return {
      status: raw.status,
      headers: raw.headers,
      body: raw.body,
    };
  }

  // null/undefined -> 204 No Content
  if (result === null || result === undefined) {
    return { status: 204, headers: [], body: Buffer.alloc(0) };
  }

  // Strings -> plain text
  if (typeof result === 'string') {
    return {
      status: statusCode,
      headers: [['content-type', 'text/plain; charset=utf-8']],
      body: Buffer.from(result, 'utf-8'),
    };
  }

  // Buffers -> octet-stream
  if (Buffer.isBuffer(result)) {
    return {
      status: statusCode,
      headers: [['content-type', 'application/octet-stream']],
      body: result,
    };
  }

  // Objects and arrays -> JSON
  if (typeof result === 'object') {
    try {
      const body = Buffer.from(JSON.stringify(result), 'utf-8');
      return {
        status: statusCode,
        headers: [['content-type', 'application/json']],
        body,
      };
    } catch {
      return errorResponse(500, 'Could not serialize response');
    }
  }

  // Fallback: try JSON
  try {
    const body = Buffer.from(JSON.stringify(result), 'utf-8');
    return {
      status: statusCode,
      headers: [['content-type', 'application/json']],
      body,
    };
  } catch {
    return errorResponse(500, 'Could not serialize response');
  }
}

function httpExceptionResponse(exc: HTTPException): RawResponseData {
  const headers: Array<[string, string]> = [
    ['content-type', 'application/json'],
  ];
  if (exc.headers) {
    for (const [k, v] of Object.entries(exc.headers)) {
      headers.push([k, v]);
    }
  }
  return {
    status: exc.statusCode,
    headers,
    body: Buffer.from(JSON.stringify({ detail: exc.detail }), 'utf-8'),
  };
}

function errorResponse(status: number, detail: string): RawResponseData {
  return {
    status,
    headers: [['content-type', 'application/json']],
    body: Buffer.from(JSON.stringify({ detail }), 'utf-8'),
  };
}

function findBestHandler(
  handlers: Map<new (...args: unknown[]) => Error, ExceptionHandler>,
  exc: Error,
): ExceptionHandler | undefined {
  let bestClass: (new (...args: unknown[]) => Error) | undefined;
  let bestHandler: ExceptionHandler | undefined;

  for (const [errClass, handler] of handlers) {
    if (exc instanceof errClass) {
      if (!bestClass || isSubclassOf(errClass, bestClass)) {
        bestClass = errClass;
        bestHandler = handler;
      }
    }
  }

  return bestHandler;
}

function isSubclassOf(
  child: new (...args: unknown[]) => Error,
  parent: new (...args: unknown[]) => Error,
): boolean {
  let proto = Object.getPrototypeOf(child) as unknown;
  while (proto) {
    if (proto === parent) return true;
    proto = Object.getPrototypeOf(proto) as unknown;
  }
  return false;
}

function rawResponseToResponse(raw: RawResponseData): Response {
  const headers: Record<string, string> = {};
  for (const [k, v] of raw.headers) {
    headers[k] = v;
  }
  let mediaType: string | undefined;
  const ct = headers['content-type'];
  if (ct) mediaType = ct;
  return new Response(raw.body, raw.status, headers, mediaType);
}

function responseToRawResponse(response: Response): RawResponseData {
  const raw = response.toRaw();
  return {
    status: raw.status,
    headers: raw.headers,
    body: raw.body,
  };
}

function joinPaths(...parts: string[]): string {
  const cleaned = parts
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
  if (cleaned.length === 0) return '/';
  return '/' + cleaned.join('/');
}

/**
 * Convert an internal RawResponseData handler into a NAPI-compatible callback.
 * The NAPI bridge expects headers as [{name, value}] objects, while internally
 * we use [[name, value]] tuples.
 */
function toNapiCallback(
  handler: (data: RawRequestData) => Promise<RawResponseData>,
): (data: unknown) => Promise<unknown> {
  return async (data: unknown): Promise<unknown> => {
    const raw = data as RawRequestData;
    const result = await handler(raw);
    return {
      status: result.status,
      headers: result.headers.map(([name, value]) => ({ name, value })),
      body: result.body,
      bodyJson: result.bodyJson,
    };
  };
}
