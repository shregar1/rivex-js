import { toRawMiddleware, CORSMiddleware } from './middleware.js';
import { controllerToRouter } from './controller.js';
import { Request } from './request.js';
import { Response } from './response.js';
import { StreamingResponse } from './response.js';
import { HTTPException } from './exceptions.js';
import { generateOpenAPI, generateSwaggerHTML } from './openapi.js';
import { createNativeServer } from './native/bindings.js';
// ── Application ──
/**
 * The main Rivex application class. Register routes, middleware,
 * lifecycle hooks, and exception handlers, then call `run()` to start
 * the server.
 */
export class Rivex {
    title;
    version;
    description;
    debug;
    docsUrl;
    openApiUrl;
    openApiTags;
    servers;
    termsOfService;
    contact;
    licenseInfo;
    lifespan;
    /** Per-application state store (shared across requests). */
    state = {};
    /** @internal */
    _routes = [];
    /** @internal */
    _middleware = [];
    /** @internal */
    _rawMiddleware = [];
    /** @internal */
    _startupHooks = [];
    /** @internal */
    _shutdownHooks = [];
    /** @internal */
    _exceptionHandlers = new Map();
    constructor(options) {
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
    get(path, handler, options) {
        return this._addRoute('GET', path, handler, options);
    }
    post(path, handler, options) {
        return this._addRoute('POST', path, handler, options);
    }
    put(path, handler, options) {
        return this._addRoute('PUT', path, handler, options);
    }
    delete(path, handler, options) {
        return this._addRoute('DELETE', path, handler, options);
    }
    patch(path, handler, options) {
        return this._addRoute('PATCH', path, handler, options);
    }
    head(path, handler, options) {
        return this._addRoute('HEAD', path, handler, options);
    }
    options(path, handler, options) {
        return this._addRoute('OPTIONS', path, handler, options);
    }
    // ── Router / Controller inclusion ──
    /** Include a router's routes into this application. */
    includeRouter(router, options) {
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
    includeController(controller, options) {
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
    use(middlewareCls, options) {
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
    middleware(type, handler) {
        if (type !== 'http') {
            throw new Error(`Unsupported middleware type "${type}". Only "http" is supported.`);
        }
        // Wrap the high-level middleware function into a raw middleware
        const rawMiddleware = async (requestData, callNext) => {
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
            const nextFn = async () => {
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
    onEvent(event, handler) {
        if (event === 'startup') {
            this._startupHooks.push(handler);
        }
        else {
            this._shutdownHooks.push(handler);
        }
        return this;
    }
    // ── Exception handlers ──
    /** Register a handler for a specific error class. */
    exceptionHandler(errorClass, handler) {
        this._exceptionHandlers.set(errorClass, handler);
        return this;
    }
    // ── Server lifecycle ──
    /**
     * Start the HTTP server. Uses the native Rust runtime when available,
     * falling back to a clear error message if bindings are not installed.
     */
    async run(host = '127.0.0.1', port = 8000, _workers = 1) {
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
        const hasCors = this._middleware.some(({ instance }) => instance instanceof CORSMiddleware);
        if (hasCors) {
            const registeredPaths = new Set(this._routes.map((r) => r.path));
            for (const path of registeredPaths) {
                const noop = async () => ({
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
        }
        finally {
            await this._runHooks(this._shutdownHooks);
        }
    }
    // ── Internal route building ──
    /** @internal */
    _buildHandler(record) {
        const handler = record.handler;
        const defaultStatus = record.options.statusCode;
        const debug = this.debug;
        const exceptionHandlers = this._exceptionHandlers;
        return async (requestData) => {
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
                const ctx = {
                    request,
                    params: requestData.pathParams ?? {},
                    state: new Map(),
                };
                const result = await handler(ctx);
                return normalizeResponse(result, defaultStatus);
            }
            catch (err) {
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
                        const ctx = {
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
                        const ctx = {
                            request,
                            params: requestData.pathParams ?? {},
                            state: new Map(),
                        };
                        const result = await customHandler(ctx, err);
                        return normalizeResponse(result, 500);
                    }
                }
                const detail = debug && err instanceof Error
                    ? err.message
                    : 'Internal Server Error';
                return errorResponse(500, detail);
            }
        };
    }
    /** @internal Apply the raw middleware stack to a handler. */
    _applyRawMiddleware(handler) {
        let wrapped = handler;
        // Apply middleware in reverse order so the first-registered runs first
        for (let i = this._rawMiddleware.length - 1; i >= 0; i--) {
            const mw = this._rawMiddleware[i];
            const inner = wrapped;
            wrapped = (requestData) => mw(requestData, inner);
        }
        return wrapped;
    }
    // ── Internal helpers ──
    _addRoute(method, path, handler, opts) {
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
    _registerOpenAPIRoutes(server) {
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
        server.addRoute('GET', this.openApiUrl, async () => ({
            status: 200,
            headers: [['content-type', 'application/json']],
            body: specBytes,
        }));
        if (this.docsUrl) {
            const html = generateSwaggerHTML(this.title, this.openApiUrl);
            const htmlBytes = Buffer.from(html, 'utf-8');
            server.addRoute('GET', this.docsUrl, async () => ({
                status: 200,
                headers: [['content-type', 'text/html; charset=utf-8']],
                body: htmlBytes,
            }));
        }
    }
    /** @internal */
    async _runHooks(hooks) {
        for (const hook of hooks) {
            await hook();
        }
    }
}
// ── Alias ──
/** FastAPI compatibility alias. */
export const FastAPI = Rivex;
// ── Response normalisation helpers ──
function normalizeResponse(result, statusCode) {
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
        }
        catch {
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
    }
    catch {
        return errorResponse(500, 'Could not serialize response');
    }
}
function httpExceptionResponse(exc) {
    const headers = [
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
function errorResponse(status, detail) {
    return {
        status,
        headers: [['content-type', 'application/json']],
        body: Buffer.from(JSON.stringify({ detail }), 'utf-8'),
    };
}
function findBestHandler(handlers, exc) {
    let bestClass;
    let bestHandler;
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
function isSubclassOf(child, parent) {
    let proto = Object.getPrototypeOf(child);
    while (proto) {
        if (proto === parent)
            return true;
        proto = Object.getPrototypeOf(proto);
    }
    return false;
}
function rawResponseToResponse(raw) {
    const headers = {};
    for (const [k, v] of raw.headers) {
        headers[k] = v;
    }
    let mediaType;
    const ct = headers['content-type'];
    if (ct)
        mediaType = ct;
    return new Response(raw.body, raw.status, headers, mediaType);
}
function responseToRawResponse(response) {
    const raw = response.toRaw();
    return {
        status: raw.status,
        headers: raw.headers,
        body: raw.body,
    };
}
function joinPaths(...parts) {
    const cleaned = parts
        .map((p) => p.replace(/^\/+|\/+$/g, ''))
        .filter(Boolean);
    if (cleaned.length === 0)
        return '/';
    return '/' + cleaned.join('/');
}
/**
 * Convert an internal RawResponseData handler into a NAPI-compatible callback.
 * The NAPI bridge expects headers as [{name, value}] objects, while internally
 * we use [[name, value]] tuples.
 */
function toNapiCallback(handler) {
    return async (data) => {
        const raw = data;
        const result = await handler(raw);
        return {
            status: result.status,
            headers: result.headers.map(([name, value]) => ({ name, value })),
            body: result.body,
            bodyJson: result.bodyJson,
        };
    };
}
//# sourceMappingURL=application.js.map