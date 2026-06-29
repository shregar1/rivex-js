/**
 * Case-insensitive HTTP headers collection. Stores the raw header pairs
 * and provides convenient lookup methods.
 */
export class Headers {
    _list;
    constructor(raw) {
        this._list = raw ? [...raw] : [];
    }
    /** Get the first value for a header name (case-insensitive). */
    get(key, defaultValue) {
        const target = key.toLowerCase();
        for (const [k, v] of this._list) {
            if (k.toLowerCase() === target)
                return v;
        }
        return defaultValue;
    }
    /** Get all values for a header name (case-insensitive). */
    getAll(key) {
        const target = key.toLowerCase();
        return this._list.filter(([k]) => k.toLowerCase() === target).map(([, v]) => v);
    }
    /** Check whether a header exists (case-insensitive). */
    has(key) {
        const target = key.toLowerCase();
        return this._list.some(([k]) => k.toLowerCase() === target);
    }
    /** Return all header names. */
    keys() {
        return this._list.map(([k]) => k);
    }
    /** Return all header values. */
    values() {
        return this._list.map(([, v]) => v);
    }
    /** Return all header entries as [name, value] tuples. */
    entries() {
        return [...this._list];
    }
    /** Iterate over all header entries. */
    forEach(callback) {
        for (const [k, v] of this._list) {
            callback(v, k);
        }
    }
    /** Number of header entries. */
    get size() {
        return this._list.length;
    }
    /** Set a header value, replacing any existing values for that name. */
    set(key, value) {
        const target = key.toLowerCase();
        const filtered = this._list.filter(([k]) => k.toLowerCase() !== target);
        filtered.push([key, value]);
        this._list.length = 0;
        this._list.push(...filtered);
    }
    /** Append a header value without removing existing values. */
    append(key, value) {
        this._list.push([key, value]);
    }
    /** Delete all values for a header name. */
    delete(key) {
        const target = key.toLowerCase();
        const filtered = this._list.filter(([k]) => k.toLowerCase() !== target);
        this._list.length = 0;
        this._list.push(...filtered);
    }
    /** Return the raw header list (for serialisation). */
    toRaw() {
        return [...this._list];
    }
}
/**
 * Represents an incoming HTTP request. Provides access to method, path,
 * headers, body, query parameters, path parameters, and cookies.
 */
export class Request {
    method;
    path;
    headers;
    body;
    queryString;
    pathParams;
    clientHost;
    clientPort;
    state;
    constructor(method, path, headers, body, queryString = '', pathParams = {}, clientHost, clientPort) {
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
    static _fromRaw(data) {
        return new Request(data.method, data.path, data.headers ?? [], data.body ?? Buffer.alloc(0), data.queryString ?? '', data.pathParams ?? {}, data.clientHost, data.clientPort);
    }
    /** Full URL including query string. */
    get url() {
        if (this.queryString) {
            return `${this.path}?${this.queryString}`;
        }
        return this.path;
    }
    /** Content-Type header value, if present. */
    get contentType() {
        return this.headers.get('content-type');
    }
    /** Parsed query parameters. Multi-value params are returned as arrays. */
    get queryParams() {
        if (!this.queryString)
            return {};
        const params = {};
        const searchParams = new URLSearchParams(this.queryString);
        for (const key of searchParams.keys()) {
            const values = searchParams.getAll(key);
            params[key] = values.length === 1 ? values[0] : values;
        }
        return params;
    }
    /** Parsed cookies from the Cookie header. */
    get cookies() {
        const cookieHeader = this.headers.get('cookie', '');
        if (!cookieHeader)
            return {};
        const result = {};
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
    header(name, defaultValue) {
        return this.headers.get(name, defaultValue);
    }
    /** Parse the request body as JSON. */
    json() {
        return JSON.parse(this.body.toString('utf-8'));
    }
    /** Return the request body as a UTF-8 string. */
    text() {
        return this.body.toString('utf-8');
    }
}
//# sourceMappingURL=request.js.map