import type { HandlerFunc, RouteOptions, RouteRecord } from './types.js';

/** Metadata stored on a decorated controller method. */
interface RouteHandlerMetadata {
  method: string;
  path: string;
  options: RouteOptions;
  order: number;
}

const ROUTE_METADATA_KEY = Symbol('rivex:route_handlers');

let _routeOrder = 0;

// ── Decorator factory ──

function routeDecorator(
  method: string,
  path: string,
  options?: RouteOptions,
): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    const fn = descriptor.value as (...args: unknown[]) => unknown;
    const existing: RouteHandlerMetadata[] =
      (fn as unknown as Record<symbol, RouteHandlerMetadata[]>)[ROUTE_METADATA_KEY] ?? [];

    existing.push({
      method,
      path,
      options: options ?? {},
      order: _routeOrder++,
    });

    (fn as unknown as Record<symbol, RouteHandlerMetadata[]>)[ROUTE_METADATA_KEY] = existing;
  };
}

// ── HTTP method decorators ──

/** Mark a controller method as a GET handler. */
export function Get(path: string, options?: RouteOptions): MethodDecorator {
  return routeDecorator('GET', path, options);
}

/** Mark a controller method as a POST handler. */
export function Post(path: string, options?: RouteOptions): MethodDecorator {
  return routeDecorator('POST', path, options);
}

/** Mark a controller method as a PUT handler. */
export function Put(path: string, options?: RouteOptions): MethodDecorator {
  return routeDecorator('PUT', path, options);
}

/** Mark a controller method as a DELETE handler. */
export function Delete(path: string, options?: RouteOptions): MethodDecorator {
  return routeDecorator('DELETE', path, options);
}

/** Mark a controller method as a PATCH handler. */
export function Patch(path: string, options?: RouteOptions): MethodDecorator {
  return routeDecorator('PATCH', path, options);
}

/** Mark a controller method as a HEAD handler. */
export function Head(path: string, options?: RouteOptions): MethodDecorator {
  return routeDecorator('HEAD', path, options);
}

/** Mark a controller method as an OPTIONS handler. */
export function Options(path: string, options?: RouteOptions): MethodDecorator {
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
export abstract class Controller {
  static path: string = '';
  static tags: string[] = [];
}

/** Check whether a value is a Controller class or instance. */
export function isController(value: unknown): value is typeof Controller | Controller {
  if (typeof value === 'function') {
    return value.prototype instanceof Controller || value === Controller;
  }
  return value instanceof Controller;
}

/** Join path segments with a leading slash and no double slashes. */
function joinPaths(...parts: string[]): string {
  const cleaned = parts
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
  if (cleaned.length === 0) return '/';
  return '/' + cleaned.join('/');
}

/**
 * Convert a Controller class (or instance) into a set of RouteRecords.
 * This collects all decorated methods and produces records with the
 * controller's path prefix and tags applied.
 */
export function controllerToRouter(
  controller: typeof Controller | Controller,
): { _routes: RouteRecord[] } {
  // Get the class constructor and an instance
  const Ctor = (typeof controller === 'function' ? controller : controller.constructor) as typeof Controller;
  const instance = typeof controller === 'function' ? new (controller as new () => Controller)() : controller;

  const basePath: string = Ctor.path ?? '';
  const baseTags: string[] = [...(Ctor.tags ?? [])];

  const handlers: Array<{
    order: number;
    handler: HandlerFunc;
    metadata: RouteHandlerMetadata;
  }> = [];

  // Walk the prototype chain to find decorated methods
  const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
  const methodNames = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== 'constructor' && typeof proto[name] === 'function',
  );

  for (const name of methodNames) {
    const method = proto[name] as (...args: unknown[]) => unknown;
    const metadataList: RouteHandlerMetadata[] | undefined =
      (method as unknown as Record<symbol, RouteHandlerMetadata[]>)[ROUTE_METADATA_KEY];

    if (!metadataList) continue;

    const boundMethod = method.bind(instance) as HandlerFunc;
    for (const metadata of metadataList) {
      handlers.push({ order: metadata.order, handler: boundMethod, metadata });
    }
  }

  // Sort by registration order for deterministic route ordering
  handlers.sort((a, b) => a.order - b.order);

  const routes: RouteRecord[] = handlers.map(({ handler, metadata }) => ({
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
