const ROUTE_METADATA_KEY = Symbol('rivex:route_handlers');
let _routeOrder = 0;
// ── Decorator factory ──
function routeDecorator(method, path, options) {
    return function (_target, _propertyKey, descriptor) {
        const fn = descriptor.value;
        const existing = fn[ROUTE_METADATA_KEY] ?? [];
        existing.push({
            method,
            path,
            options: options ?? {},
            order: _routeOrder++,
        });
        fn[ROUTE_METADATA_KEY] = existing;
    };
}
// ── HTTP method decorators ──
/** Mark a controller method as a GET handler. */
export function Get(path, options) {
    return routeDecorator('GET', path, options);
}
/** Mark a controller method as a POST handler. */
export function Post(path, options) {
    return routeDecorator('POST', path, options);
}
/** Mark a controller method as a PUT handler. */
export function Put(path, options) {
    return routeDecorator('PUT', path, options);
}
/** Mark a controller method as a DELETE handler. */
export function Delete(path, options) {
    return routeDecorator('DELETE', path, options);
}
/** Mark a controller method as a PATCH handler. */
export function Patch(path, options) {
    return routeDecorator('PATCH', path, options);
}
/** Mark a controller method as a HEAD handler. */
export function Head(path, options) {
    return routeDecorator('HEAD', path, options);
}
/** Mark a controller method as an OPTIONS handler. */
export function Options(path, options) {
    return routeDecorator('OPTIONS', path, options);
}
// ── Controller base class ──
/**
 * Abstract base for decorator-based controllers. Subclasses define
 * a `path` and optional `tags`, then decorate methods with `@Get()`,
 * `@Post()`, etc.
 *
 * ```ts
 * class UsersController extends Controller {
 *   static path = '/users';
 *   static tags = ['users'];
 *
 *   @Get('/{id}')
 *   async getUser(ctx) { ... }
 * }
 * ```
 */
export class Controller {
    static path = '';
    static tags = [];
}
/** Check whether a value is a Controller class or instance. */
export function isController(value) {
    if (typeof value === 'function') {
        return value.prototype instanceof Controller || value === Controller;
    }
    return value instanceof Controller;
}
/** Join path segments with a leading slash and no double slashes. */
function joinPaths(...parts) {
    const cleaned = parts
        .map((p) => p.replace(/^\/+|\/+$/g, ''))
        .filter(Boolean);
    if (cleaned.length === 0)
        return '/';
    return '/' + cleaned.join('/');
}
/**
 * Convert a Controller class (or instance) into a set of RouteRecords.
 * This collects all decorated methods and produces records with the
 * controller's path prefix and tags applied.
 */
export function controllerToRouter(controller) {
    // Get the class constructor and an instance
    const Ctor = (typeof controller === 'function' ? controller : controller.constructor);
    const instance = typeof controller === 'function' ? new controller() : controller;
    const basePath = Ctor.path ?? '';
    const baseTags = [...(Ctor.tags ?? [])];
    const handlers = [];
    // Walk the prototype chain to find decorated methods
    const proto = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(proto).filter((name) => name !== 'constructor' && typeof proto[name] === 'function');
    for (const name of methodNames) {
        const method = proto[name];
        const metadataList = method[ROUTE_METADATA_KEY];
        if (!metadataList)
            continue;
        const boundMethod = method.bind(instance);
        for (const metadata of metadataList) {
            handlers.push({ order: metadata.order, handler: boundMethod, metadata });
        }
    }
    // Sort by registration order for deterministic route ordering
    handlers.sort((a, b) => a.order - b.order);
    const routes = handlers.map(({ handler, metadata }) => ({
        method: metadata.method,
        path: joinPaths(basePath, metadata.path),
        handler,
        options: {
            statusCode: metadata.options.statusCode ?? 200,
            tags: [...baseTags, ...(metadata.options.tags ?? [])],
            deprecated: metadata.options.deprecated ?? false,
            includeInSchema: metadata.options.includeInSchema ?? true,
            summary: metadata.options.summary,
            description: metadata.options.description,
            operationId: metadata.options.operationId,
            responseModel: metadata.options.responseModel,
            openApiExtra: metadata.options.openApiExtra,
        },
    }));
    return { _routes: routes };
}
//# sourceMappingURL=controller.js.map