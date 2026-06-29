// ── Test response ──
/** Response object returned from TestClient requests. */
export class TestResponse {
    statusCode;
    headers;
    body;
    constructor(statusCode, headers, body) {
        this.statusCode = statusCode;
        this.headers = headers;
        this.body = body;
    }
    /** Parse the response body as JSON. */
    json() {
        return JSON.parse(this.body.toString('utf-8'));
    }
    /** Return the response body as a UTF-8 string. */
    text() {
        return this.body.toString('utf-8');
    }
}
// ── Test client ──
/**
 * In-process test client that dispatches requests directly to the
 * application's route handlers without starting a real HTTP server.
 * Applies middleware and exception handlers the same way the production
 * server does.
 */
export class TestClient {
    // Vitest / Jest marker — prevents the class itself from being treated
    // as a test suite.
    static __test__ = false;
    app;
    constructor(app) {
        this.app = app;
    }
    async get(url, options) {
        return this.request('GET', url, options);
    }
    async post(url, options) {
        return this.request('POST', url, options);
    }
    async put(url, options) {
        return this.request('PUT', url, options);
    }
    async delete(url, options) {
        return this.request('DELETE', url, options);
    }
    async patch(url, options) {
        return this.request('PATCH', url, options);
    }
    async head(url, options) {
        return this.request('HEAD', url, options);
    }
    /** Send a request with an arbitrary HTTP method. */
    async request(method, url, options) {
        const requestData = buildRequest(method.toUpperCase(), url, options);
        const handler = this._resolveHandler(method.toUpperCase(), requestData.path);
        const raw = await handler(requestData);
        return toTestResponse(raw);
    }
    /** Start lifecycle hooks. Returns a dispose function for cleanup. */
    async start() {
        await this.app._runHooks(this.app._startupHooks);
        return async () => {
            await this.app._runHooks(this.app._shutdownHooks);
        };
    }
    // ── Internal route resolution ──
    _resolveHandler(method, path) {
        for (const record of this.app._routes) {
            if (record.method !== method)
                continue;
            const pathParams = matchPath(record.path, path);
            if (pathParams === null)
                continue;
            const routeHandler = this.app._buildHandler(record);
            const wrapped = this.app._applyRawMiddleware(routeHandler);
            return async (requestData) => {
                requestData.pathParams = { ...pathParams };
                return wrapped(requestData);
            };
        }
        // No matching route -> 404
        return async () => ({
            status: 404,
            headers: [['content-type', 'application/json']],
            body: Buffer.from('{"detail":"Not Found"}', 'utf-8'),
        });
    }
}
// ── Helpers ──
function buildRequest(method, url, options) {
    // Parse URL
    let path;
    let queryString;
    const qIndex = url.indexOf('?');
    if (qIndex !== -1) {
        path = url.slice(0, qIndex);
        queryString = url.slice(qIndex + 1);
    }
    else {
        path = url || '/';
        queryString = '';
    }
    // Merge query params
    if (options?.params) {
        const extra = new URLSearchParams();
        for (const [k, v] of Object.entries(options.params)) {
            extra.set(k, String(v));
        }
        const extraStr = extra.toString();
        queryString = queryString ? `${queryString}&${extraStr}` : extraStr;
    }
    // Build headers
    const headerItems = [];
    if (options?.headers) {
        for (const [k, v] of Object.entries(options.headers)) {
            headerItems.push([k.toLowerCase(), v]);
        }
    }
    // Build body
    let body = Buffer.alloc(0);
    if (options?.json !== undefined) {
        body = Buffer.from(JSON.stringify(options.json), 'utf-8');
        headerItems.push(['content-type', 'application/json']);
    }
    else if (options?.data !== undefined) {
        if (typeof options.data === 'string') {
            body = Buffer.from(options.data, 'utf-8');
        }
        else {
            body = Buffer.from(new URLSearchParams(options.data).toString(), 'utf-8');
            headerItems.push(['content-type', 'application/x-www-form-urlencoded']);
        }
    }
    else if (options?.body !== undefined) {
        body =
            typeof options.body === 'string'
                ? Buffer.from(options.body, 'utf-8')
                : Buffer.from(options.body);
    }
    return {
        method,
        path,
        pathParams: {},
        queryString,
        headers: headerItems,
        body,
    };
}
function toTestResponse(raw) {
    let body = raw.body;
    const rawAny = raw;
    if (rawAny.bodyJson !== undefined) {
        body = Buffer.from(JSON.stringify(rawAny.bodyJson), 'utf-8');
    }
    const headers = {};
    for (const [k, v] of raw.headers) {
        headers[k.toLowerCase()] = v;
    }
    return new TestResponse(raw.status, headers, body);
}
/**
 * Match a route pattern against an actual path. Returns the extracted
 * path parameters on match, or null if the path does not match.
 */
function matchPath(pattern, path) {
    const names = [];
    const parts = [];
    const segments = pattern.replace(/^\/+|\/+$/g, '').split('/');
    for (const segment of segments) {
        if (segment.startsWith('{') && segment.endsWith('}')) {
            names.push(segment.slice(1, -1));
            parts.push('([^/]+)');
        }
        else {
            parts.push(escapeRegex(segment));
        }
    }
    let regex;
    if (pattern === '/') {
        regex = '^/$';
    }
    else {
        regex = '^/' + parts.join('/') + '$';
    }
    const match = new RegExp(regex).exec(path);
    if (!match)
        return null;
    const params = {};
    for (let i = 0; i < names.length; i++) {
        params[names[i]] = match[i + 1];
    }
    return params;
}
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=testing.js.map