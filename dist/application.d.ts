import type { ExceptionHandler, HandlerFunc, RouteOptions, RouteRecord } from './types.js';
import type { Middleware, MiddlewareClass, MiddlewareFunc, RawMiddlewareFunc, RawRequestData, RawResponseData } from './middleware.js';
import { Router } from './router.js';
import type { Controller } from './controller.js';
export interface RivexOptions {
    title?: string;
    version?: string;
    description?: string;
    debug?: boolean;
    docsUrl?: string | null;
    openApiUrl?: string | null;
    openApiTags?: Array<{
        name: string;
        description?: string;
    }>;
    servers?: Array<{
        url: string;
        description?: string;
    }>;
    termsOfService?: string;
    contact?: Record<string, string>;
    licenseInfo?: Record<string, string>;
    lifespan?: (app: Rivex) => AsyncGenerator;
}
/**
 * The main Rivex application class. Register routes, middleware,
 * lifecycle hooks, and exception handlers, then call `run()` to start
 * the server.
 */
export declare class Rivex {
    readonly title: string;
    readonly version: string;
    readonly description?: string;
    readonly debug: boolean;
    readonly docsUrl: string | null;
    readonly openApiUrl: string | null;
    readonly openApiTags?: Array<{
        name: string;
        description?: string;
    }>;
    readonly servers?: Array<{
        url: string;
        description?: string;
    }>;
    readonly termsOfService?: string;
    readonly contact?: Record<string, string>;
    readonly licenseInfo?: Record<string, string>;
    readonly lifespan?: (app: Rivex) => AsyncGenerator;
    /** Per-application state store (shared across requests). */
    state: Record<string, unknown>;
    /** @internal */
    _routes: RouteRecord[];
    /** @internal */
    _middleware: Array<{
        instance: Middleware;
        options: Record<string, unknown>;
    }>;
    /** @internal */
    _rawMiddleware: RawMiddlewareFunc[];
    /** @internal */
    _startupHooks: Array<() => void | Promise<void>>;
    /** @internal */
    _shutdownHooks: Array<() => void | Promise<void>>;
    /** @internal */
    _exceptionHandlers: Map<new (...args: unknown[]) => Error, ExceptionHandler>;
    constructor(options?: RivexOptions);
    get(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    post(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    put(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    delete(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    patch(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    head(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    options(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    /** Include a router's routes into this application. */
    includeRouter(router: Router, options?: {
        prefix?: string;
        tags?: string[];
    }): this;
    /** Include a controller class's routes. */
    includeController(controller: typeof Controller | Controller, options?: {
        prefix?: string;
        tags?: string[];
    }): this;
    /**
     * Add a class-based middleware. Instantiates the class with the provided
     * options and adds it to the middleware stack.
     */
    use(middlewareCls: MiddlewareClass, options?: Record<string, unknown>): this;
    /**
     * Register a function-based middleware using the `@app.middleware("http")`
     * pattern from FastAPI.
     */
    middleware(type: 'http', handler: MiddlewareFunc): this;
    /** Register a startup or shutdown event handler. */
    onEvent(event: 'startup' | 'shutdown', handler: () => void | Promise<void>): this;
    /** Register a handler for a specific error class. */
    exceptionHandler<T extends Error>(errorClass: new (...args: unknown[]) => T, handler: ExceptionHandler<T>): this;
    /**
     * Start the HTTP server. Uses the native Rust runtime when available,
     * falling back to a clear error message if bindings are not installed.
     */
    run(host?: string, port?: number, _workers?: number): Promise<void>;
    /** @internal */
    _buildHandler(record: RouteRecord): (requestData: RawRequestData) => Promise<RawResponseData>;
    /** @internal Apply the raw middleware stack to a handler. */
    _applyRawMiddleware(handler: (requestData: RawRequestData) => Promise<RawResponseData>): (requestData: RawRequestData) => Promise<RawResponseData>;
    private _addRoute;
    private _registerOpenAPIRoutes;
    /** @internal */
    _runHooks(hooks: Array<() => void | Promise<void>>): Promise<void>;
}
/** FastAPI compatibility alias. */
export declare const FastAPI: typeof Rivex;
//# sourceMappingURL=application.d.ts.map