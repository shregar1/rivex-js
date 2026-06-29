/**
 * Abstract base class for class-based dependency providers.
 * Subclasses implement `resolve()` which receives the request context
 * and returns the resolved dependency value.
 */
export class Dependency {
}
/**
 * Marker returned by `Depends()` that records the dependency provider
 * and caching preference. Used by the injection system to resolve
 * dependencies before calling the handler.
 */
export class DependencyMarker {
    provider;
    useCache;
    constructor(provider, useCache) {
        this.provider = provider;
        this.useCache = useCache;
    }
}
/**
 * Create a dependency marker. The handler wrapper will call the provider
 * with the request context and inject the result as the dependency value.
 *
 * @param provider - A function `(ctx) => T` or a `Dependency` subclass.
 * @param options  - `useCache` (default true) caches the resolved value
 *                   per request so the same dependency is only resolved once.
 */
export function Depends(provider, options) {
    return new DependencyMarker(provider, options?.useCache ?? true);
}
/**
 * Resolve a dependency provider to its value, handling both function
 * providers and class-based providers transparently.
 */
export async function resolveDependency(provider, ctx, cache, useCache) {
    if (useCache && cache.has(provider)) {
        return cache.get(provider);
    }
    let result;
    if (isClass(provider)) {
        const instance = new provider();
        result = await instance.resolve(ctx);
    }
    else {
        result = await provider(ctx);
    }
    if (useCache) {
        cache.set(provider, result);
    }
    return result;
}
/** Check whether a provider is a class constructor (vs a plain function). */
function isClass(fn) {
    return (typeof fn === 'function' &&
        fn.prototype !== undefined &&
        fn.prototype.resolve !== undefined);
}
//# sourceMappingURL=depends.js.map