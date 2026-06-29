import type { HandlerFunc, RouteOptions, RouteRecord } from './types.js';
import type { Controller } from './controller.js';
/**
 * Router groups related routes under a common prefix and set of tags.
 * Can be included in an application or nested inside other routers.
 */
export declare class Router {
    readonly prefix: string;
    readonly tags: string[];
    /** @internal */
    _routes: RouteRecord[];
    constructor(options?: {
        prefix?: string;
        tags?: string[];
    });
    get(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    post(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    put(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    delete(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    patch(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    head(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    options(path: string, handler: HandlerFunc, options?: RouteOptions): this;
    /** Include another router's routes, optionally adding a prefix and tags. */
    includeRouter(router: Router, options?: {
        prefix?: string;
        tags?: string[];
    }): this;
    /** Include a controller class's routes. */
    includeController(controller: typeof Controller | Controller, options?: {
        prefix?: string;
        tags?: string[];
    }): this;
    private _addRoute;
}
/**
 * APIRouter is an alias for Router, matching the Python SDK's dual naming.
 */
export declare const APIRouter: typeof Router;
//# sourceMappingURL=router.d.ts.map