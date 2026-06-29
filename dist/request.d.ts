import type { RawRequest } from './types.js';
/**
 * Case-insensitive HTTP headers collection. Stores the raw header pairs
 * and provides convenient lookup methods.
 */
export declare class Headers {
    private readonly _list;
    constructor(raw?: Array<[string, string]>);
    /** Get the first value for a header name (case-insensitive). */
    get(key: string, defaultValue?: string): string | undefined;
    /** Get all values for a header name (case-insensitive). */
    getAll(key: string): string[];
    /** Check whether a header exists (case-insensitive). */
    has(key: string): boolean;
    /** Return all header names. */
    keys(): string[];
    /** Return all header values. */
    values(): string[];
    /** Return all header entries as [name, value] tuples. */
    entries(): Array<[string, string]>;
    /** Iterate over all header entries. */
    forEach(callback: (value: string, key: string) => void): void;
    /** Number of header entries. */
    get size(): number;
    /** Set a header value, replacing any existing values for that name. */
    set(key: string, value: string): void;
    /** Append a header value without removing existing values. */
    append(key: string, value: string): void;
    /** Delete all values for a header name. */
    delete(key: string): void;
    /** Return the raw header list (for serialisation). */
    toRaw(): Array<[string, string]>;
}
/**
 * Represents an incoming HTTP request. Provides access to method, path,
 * headers, body, query parameters, path parameters, and cookies.
 */
export declare class Request {
    readonly method: string;
    readonly path: string;
    readonly headers: Headers;
    readonly body: Buffer;
    readonly queryString: string;
    readonly pathParams: Record<string, string>;
    readonly clientHost?: string;
    readonly clientPort?: number;
    readonly state: Map<string, unknown>;
    constructor(method: string, path: string, headers: Array<[string, string]>, body: Buffer, queryString?: string, pathParams?: Record<string, string>, clientHost?: string, clientPort?: number);
    /** Construct a Request from a raw request object (used internally). */
    static _fromRaw(data: RawRequest): Request;
    /** Full URL including query string. */
    get url(): string;
    /** Content-Type header value, if present. */
    get contentType(): string | undefined;
    /** Parsed query parameters. Multi-value params are returned as arrays. */
    get queryParams(): Record<string, string | string[]>;
    /** Parsed cookies from the Cookie header. */
    get cookies(): Record<string, string>;
    /** Get a single header value by name (case-insensitive). */
    header(name: string, defaultValue?: string): string | undefined;
    /** Parse the request body as JSON. */
    json<T = unknown>(): T;
    /** Return the request body as a UTF-8 string. */
    text(): string;
}
//# sourceMappingURL=request.d.ts.map