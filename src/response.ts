import type { RawResponse } from './types.js';

/**
 * Base HTTP response. Subclasses provide convenient constructors for
 * common content types (JSON, HTML, plaintext, redirect, streaming).
 */
export class Response {
  content: unknown;
  statusCode: number;
  headers: Record<string, string>;
  mediaType: string | undefined;

  constructor(
    content?: unknown,
    statusCode: number = 200,
    headers: Record<string, string> = {},
    mediaType?: string,
  ) {
    this.content = content;
    this.statusCode = statusCode;
    this.headers = { ...headers };
    this.mediaType = mediaType;
  }

  /** Serialise to the raw response format used by the native layer. */
  toRaw(): RawResponse {
    const headerList: Array<[string, string]> = Object.entries(this.headers);
    if (this.mediaType) {
      const hasContentType = headerList.some(
        ([k]) => k.toLowerCase() === 'content-type',
      );
      if (!hasContentType) {
        headerList.push(['content-type', this.mediaType]);
      }
    }
    const body = this._renderBody();
    return { status: this.statusCode, headers: headerList, body };
  }

  /** Render the content to a Buffer. Override in subclasses. */
  protected _renderBody(): Buffer {
    if (this.content === null || this.content === undefined) {
      return Buffer.alloc(0);
    }
    if (Buffer.isBuffer(this.content)) {
      return this.content;
    }
    if (typeof this.content === 'string') {
      return Buffer.from(this.content, 'utf-8');
    }
    return Buffer.from(String(this.content), 'utf-8');
  }
}

/** JSON response with automatic serialisation. */
export class JSONResponse extends Response {
  constructor(
    content: unknown,
    statusCode: number = 200,
    headers: Record<string, string> = {},
  ) {
    super(content, statusCode, headers, 'application/json');
  }

  protected _renderBody(): Buffer {
    return Buffer.from(JSON.stringify(this.content), 'utf-8');
  }
}

/** HTML response. */
export class HTMLResponse extends Response {
  constructor(
    content: string,
    statusCode: number = 200,
    headers: Record<string, string> = {},
  ) {
    super(content, statusCode, headers, 'text/html; charset=utf-8');
  }
}

/** Plain text response. */
export class PlainTextResponse extends Response {
  constructor(
    content: string,
    statusCode: number = 200,
    headers: Record<string, string> = {},
  ) {
    super(content, statusCode, headers, 'text/plain; charset=utf-8');
  }
}

/** Redirect response (defaults to HTTP 307 Temporary Redirect). */
export class RedirectResponse extends Response {
  constructor(
    url: string,
    statusCode: number = 307,
    headers: Record<string, string> = {},
  ) {
    super(Buffer.alloc(0), statusCode, { ...headers, location: url });
  }
}

/**
 * Streaming response that collects chunks from an async iterable or
 * ReadableStream into a single body buffer.
 */
export class StreamingResponse extends Response {
  private readonly _stream: AsyncIterable<Buffer | string> | ReadableStream<Buffer | string>;

  constructor(
    content: AsyncIterable<Buffer | string> | ReadableStream<Buffer | string>,
    statusCode: number = 200,
    headers: Record<string, string> = {},
    mediaType?: string,
  ) {
    super(null, statusCode, headers, mediaType);
    this._stream = content;
  }

  /** Collect the full stream into a raw response. */
  async toRawAsync(): Promise<RawResponse> {
    const chunks: Buffer[] = [];

    if (Symbol.asyncIterator in (this._stream as object)) {
      for await (const chunk of this._stream as AsyncIterable<Buffer | string>) {
        chunks.push(
          typeof chunk === 'string' ? Buffer.from(chunk, 'utf-8') : chunk,
        );
      }
    } else {
      const reader = (this._stream as ReadableStream<Buffer | string>).getReader();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(
          typeof value === 'string' ? Buffer.from(value, 'utf-8') : value,
        );
      }
    }

    const body = Buffer.concat(chunks);
    const headerList: Array<[string, string]> = Object.entries(this.headers);
    if (this.mediaType) {
      const hasContentType = headerList.some(
        ([k]) => k.toLowerCase() === 'content-type',
      );
      if (!hasContentType) {
        headerList.push(['content-type', this.mediaType]);
      }
    }
    return { status: this.statusCode, headers: headerList, body };
  }

  protected _renderBody(): Buffer {
    // Synchronous fallback — callers should prefer toRawAsync() for streams.
    return Buffer.alloc(0);
  }
}
