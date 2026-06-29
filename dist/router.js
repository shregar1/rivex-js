import { controllerToRouter } from './controller.js';
/** Join URL path segments, ensuring a leading slash and no double slashes. */
function joinPaths(...parts) {
    const cleaned = parts
        .map((p) => p.replace(/^\/+|\/+$/g, ''))
        .filter(Boolean);
    if (cleaned.length === 0)
        return '/';
    return '/' + cleaned.join('/');
}
/**
 * Router groups related routes under a common prefix and set of tags.
 * Can be included in an application or nested inside other routers.
 */
export class Router {
    prefix;
    tags;
    /** @internal */
    _routes = [];
    constructor(options) {
        this.prefix = options?.prefix ?? '';
        this.tags = options?.tags ?? [];
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
    // ── Router inclusion ──
    /** Include another router's routes, optionally adding a prefix and tags. */
    includeRouter(router, options) {
        const prefix = options?.prefix ?? '';
        const tags = options?.tags ?? [];
        for (const record of router._routes) {
            this._routes.push({
                method: record.method,
                path: joinPaths(this.prefix, prefix, record.path),
                handler: record.handler,
                options: {
                    ...record.options,
                    tags: [...this.tags, ...tags, ...record.options.tags],
                },
            });
        }
        return this;
    }
    /** Include a controller class's routes. */
    includeController(controller, options) {
        const result = controllerToRouter(controller);
        const prefix = options?.prefix ?? '';
        const tags = options?.tags ?? [];
        for (const record of result._routes) {
            this._routes.push({
                method: record.method,
                path: joinPaths(this.prefix, prefix, record.path),
                handler: record.handler,
                options: {
                    ...record.options,
                    tags: [...this.tags, ...tags, ...record.options.tags],
                },
            });
        }
        return this;
    }
    // ── Internal ──
    _addRoute(method, path, handler, opts) {
        const fullPath = joinPaths(this.prefix, path);
        this._routes.push({
            method,
            path: fullPath,
            handler,
            options: {
                statusCode: opts?.statusCode ?? 200,
                tags: [...this.tags, ...(opts?.tags ?? [])],
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
}
/**
 * APIRouter is an alias for Router, matching the Python SDK's dual naming.
 */
export const APIRouter = Router;
//# sourceMappingURL=router.js.map