import type { RawRequest } from './types.js';

/**
 * Case-insensitive HTTP headers collection. Stores the raw header pairs
 * and provides convenient lookup methods.
 */
export class Headers {
  private readonly _list: Array<[string, string]>;

  constructor(raw?: Array<[string, string]>) {
    this._list = raw ? [...raw] : [];
  }

  /** Get the first value for a header name (case-insensitive). */
  get(key: string, defaultValue?: string): string | undefined {
    const target = key.toLowerCase();
    for (const [k, v] of this._list) {
      if (k.toLowerCase() === target) return v;
    }
    return defaultValue;
  }

  /** Get all values for a header name (case-insensitive). */
  getAll(key: string): string[] {
    const target = key.toLowerCase();
    return this._list.filter(([k]) => k.toLowerCase() === target).map(([, v]) => v);
  }

  /** Check whether a header exists (case-insensitive). */
  has(key: string): boolean {
    const target = key.toLowerCase();
    return this._list.some(([k]) => k.toLowerCase() === target);
  }

  /** Return all header names. */
  keys(): string[] {
    return this._list.map(([k]) => k);
  }

  /** Return all header values. */
  values(): string[] {
    return this._list.map(([, v]) => v);
  }

  /** Return all header entries as [name, value] tuples. */
  entries(): Array<[string, string]> {
    return [...this._list];
  }

  /** Iterate over all header entries. */
  forEach(callback: (value: string, key: string) => void): void {
    for (const [k, v] of this._list) {
      callback(v, k);
    }
  }

  /** Number of header entries. */
  get size(): number {
    return this._list.length;
  }

  /** Set a header value, replacing any existing values for that name. */
  set(key: string, value: string): void {
    const target = key.toLowerCase();
    const filtered = this._list.filter(([k]) => k.toLowerCase() !== target);
    filtered.push([key, value]);
    this._list.length = 0;
    this._list.push(...filtered);
  }

  /** Append a header value without removing existing values. */
  append(key: string, value: string): void {
    this._list.push([key, value]);
  }

  /** Delete all values for a header name. */
  delete(key: string): void {
    const target = key.toLowerCase();
    const filtered = this._list.filter(([k]) => k.toLowerCase() !== target);
    this._list.length = 0;
    this._list.push(...filtered);
  }

  /** Return the raw header list (for serialisation). */
  toRaw(): Array<[string, string]> {
    return [...this._list];
  }
}

/**
 * Represents an incoming HTTP request. Provides access to method, path,
 * headers, body, query parameters, path parameters, and cookies.
 */
export class Request {
  readonly method: string;
  readonly path: string;
  readonly headers: Headers;
  readonly body: Buffer;
  readonly queryString: string;
  readonly pathParams: Record<string, string>;
  readonly clientHost?: string;
  readonly clientPort?: number;
  readonly state: Map<string, unknown>;

  constructor(
    method: string,
    path: string,
    headers: Array<[string, string]>,
    body: Buffer,
    queryString: string = '',
    pathParams: Record<string, string> = {},
    clientHost?: string,
    clientPort?: number,
  ) {
    this.method = method;
    this.path = path;
    this.headers = new Headers(headers);
    this.body = body;
    this.queryString = queryString;
    this.pathParams = pathParams;
    this.clientHost = clientHost;
    this.clientPort = clientPort;
    this.state = new Map();
  }

  /** Construct a Request from a raw request object (used internally). */
  static _fromRaw(data: RawRequest): Request {
    return new Request(
      data.method,
      data.path,
      data.headers ?? [],
      data.body ?? Buffer.alloc(0),
      data.queryString ?? '',
      data.pathParams ?? {},
      data.clientHost,
      data.clientPort,
    );
  }

  /** Full URL including query string. */
  get url(): string {
    if (this.queryString) {
      return `${this.path}?${this.queryString}`;
    }
    return this.path;
  }

  /** Content-Type header value, if present. */
  get contentType(): string | undefined {
    return this.headers.get('content-type');
  }

  /** Parsed query parameters. Multi-value params are returned as arrays. */
  get queryParams(): Record<string, string | string[]> {
    if (!this.queryString) return {};
    const params: Record<string, string | string[]> = {};
    const searchParams = new URLSearchParams(this.queryString);
    for (const key of searchParams.keys()) {
      const values = searchParams.getAll(key);
      params[key] = values.length === 1 ? values[0] : values;
    }
    return params;
  }

  /** Parsed cookies from the Cookie header. */
  get cookies(): Record<string, string> {
    const cookieHeader = this.headers.get('cookie', '');
    if (!cookieHeader) return {};
    const result: Record<string, string> = {};
    for (const pair of cookieHeader.split(';')) {
      const trimmed = pair.trim();
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex !== -1) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        result[key] = value;
      }
    }
    return result;
  }

  /** Get a single header value by name (case-insensitive). */
  header(name: string, defaultValue?: string): string | undefined {
    return this.headers.get(name, defaultValue);
  }

  /** Parse the request body as JSON. */
  json<T = unknown>(): T {
    return JSON.parse(this.body.toString('utf-8')) as T;
  }

  /** Return the request body as a UTF-8 string. */
  text(): string {
    return this.body.toString('utf-8');
  }
}
