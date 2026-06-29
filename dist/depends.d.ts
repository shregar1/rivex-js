import type { Context } from './types.js';
/**
 * Abstract base class for class-based dependency providers.
 * Subclasses implement `resolve()` which receives the request context
 * and returns the resolved dependency value.
 */
export declare abstract class Dependency<T = unknown> {
    abstract resolve(ctx: Context): T | Promise<T>;
}
/**
 * Marker returned by `Depends()` that records the dependency provider
 * and caching preference. Used by the injection system to resolve
 * dependencies before calling the handler.
 */
export declare class DependencyMarker<T = unknown> {
    readonly provider: DependencyProvider<T>;
    readonly useCache: boolean;
    constructor(provider: DependencyProvider<T>, useCache: boolean);
}
/** A dependency provider is either a function or a Dependency subclass. */
export type DependencyProvider<T> = ((ctx: Context) => T | Promise<T>) | (new () => Dependency<T>);
/**
 * Create a dependency marker. The handler wrapper will call the provider
 * with the request context and inject the result as the dependency value.
 *
 * @param provider - A function `(ctx) => T` or a `Dependency` subclass.
 * @param options  - `useCache` (default true) caches the resolved value
 *                   per request so the same dependency is only resolved once.
 */
export declare function Depends<T>(provider: DependencyProvider<T>, options?: {
    useCache?: boolean;
}): DependencyMarker<T>;
/**
 * Resolve a dependency provider to its value, handling both function
 * providers and class-based providers transparently.
 */
export declare function resolveDependency<T>(provider: DependencyProvider<T>, ctx: Context, cache: Map<DependencyProvider<unknown>, unknown>, useCache: boolean): Promise<T>;
//# sourceMappingURL=depends.d.ts.map