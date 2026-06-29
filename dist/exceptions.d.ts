/**
 * HTTP exception that can be thrown from any handler or middleware to
 * short-circuit processing and return an error response.
 */
export declare class HTTPException extends Error {
    readonly statusCode: number;
    readonly detail: unknown;
    readonly headers?: Record<string, string>;
    constructor(statusCode: number, detail?: unknown, headers?: Record<string, string>);
}
//# sourceMappingURL=exceptions.d.ts.map