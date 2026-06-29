import type { Rivex } from './application.js';
export interface RequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    json?: unknown;
    data?: Record<string, string> | string;
    body?: Buffer | string;
}
/** Response object returned from TestClient requests. */
export declare class TestResponse {
    readonly statusCode: number;
    readonly headers: Record<string, string>;
    readonly body: Buffer;
    constructor(statusCode: number, headers: Record<string, string>, body: Buffer);
    /** Parse the response body as JSON. */
    json<T = unknown>(): T;
    /** Return the response body as a UTF-8 string. */
    text(): string;
}
/**
 * In-process test client that dispatches requests directly to the
 * application's route handlers without starting a real HTTP server.
 * Applies middleware and exception handlers the same way the production
 * server does.
 */
export declare class TestClient {
    static __test__: boolean;
    private readonly app;
    constructor(app: Rivex);
    get(url: string, options?: RequestOptions): Promise<TestResponse>;
    post(url: string, options?: RequestOptions): Promise<TestResponse>;
    put(url: string, options?: RequestOptions): Promise<TestResponse>;
    delete(url: string, options?: RequestOptions): Promise<TestResponse>;
    patch(url: string, options?: RequestOptions): Promise<TestResponse>;
    head(url: string, options?: RequestOptions): Promise<TestResponse>;
    /** Send a request with an arbitrary HTTP method. */
    request(method: string, url: string, options?: RequestOptions): Promise<TestResponse>;
    /** Start lifecycle hooks. Returns a dispose function for cleanup. */
    start(): Promise<() => Promise<void>>;
    private _resolveHandler;
}
//# sourceMappingURL=testing.d.ts.map