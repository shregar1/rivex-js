import type { RouteOptions, RouteRecord } from './types.js';
/** Mark a controller method as a GET handler. */
export declare function Get(path: string, options?: RouteOptions): MethodDecorator;
/** Mark a controller method as a POST handler. */
export declare function Post(path: string, options?: RouteOptions): MethodDecorator;
/** Mark a controller method as a PUT handler. */
export declare function Put(path: string, options?: RouteOptions): MethodDecorator;
/** Mark a controller method as a DELETE handler. */
export declare function Delete(path: string, options?: RouteOptions): MethodDecorator;
/** Mark a controller method as a PATCH handler. */
export declare function Patch(path: string, options?: RouteOptions): MethodDecorator;
/** Mark a controller method as a HEAD handler. */
export declare function Head(path: string, options?: RouteOptions): MethodDecorator;
/** Mark a controller method as an OPTIONS handler. */
export declare function Options(path: string, options?: RouteOptions): MethodDecorator;
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
export declare abstract class Controller {
    static path: string;
    static tags: string[];
}
/** Check whether a value is a Controller class or instance. */
export declare function isController(value: unknown): value is typeof Controller | Controller;
/**
 * Convert a Controller class (or instance) into a set of RouteRecords.
 * This collects all decorated methods and produces records with the
 * controller's path prefix and tags applied.
 */
export declare function controllerToRouter(controller: typeof Controller | Controller): {
    _routes: RouteRecord[];
};
//# sourceMappingURL=controller.d.ts.map