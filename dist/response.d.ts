import type { RawResponse } from './types.js';
/**
 * Base HTTP response. Subclasses provide convenient constructors for
 * common content types (JSON, HTML, plaintext, redirect, streaming).
 */
export declare class Response {
    content: unknown;
    statusCode: number;
    headers: Record<string, string>;
    mediaType: string | undefined;
    constructor(content?: unknown, statusCode?: number, headers?: Record<string, string>, mediaType?: string);
    /** Serialise to the raw response format used by the native layer. */
    toRaw(): RawResponse;
    /** Render the content to a Buffer. Override in subclasses. */
    protected _renderBody(): Buffer;
}
/** JSON response with automatic serialisation. */
export declare class JSONResponse extends Response {
    constructor(content: unknown, statusCode?: number, headers?: Record<string, string>);
    protected _renderBody(): Buffer;
}
/** HTML response. */
export declare class HTMLResponse extends Response {
    constructor(content: string, statusCode?: number, headers?: Record<string, string>);
}
/** Plain text response. */
export declare class PlainTextResponse extends Response {
    constructor(content: string, statusCode?: number, headers?: Record<string, string>);
}
/** Redirect response (defaults to HTTP 307 Temporary Redirect). */
export declare class RedirectResponse extends Response {
    constructor(url: string, statusCode?: number, headers?: Record<string, string>);
}
/**
 * Streaming response that collects chunks from an async iterable or
 * ReadableStream into a single body buffer.
 */
export declare class StreamingResponse extends Response {
    private readonly _stream;
    constructor(content: AsyncIterable<Buffer | string> | ReadableStream<Buffer | string>, statusCode?: number, headers?: Record<string, string>, mediaType?: string);
    /** Collect the full stream into a raw response. */
    toRawAsync(): Promise<RawResponse>;
    protected _renderBody(): Buffer;
}
//# sourceMappingURL=response.d.ts.map