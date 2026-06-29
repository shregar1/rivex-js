import { randomUUID } from 'node:crypto';
import { gzipSync } from 'node:zlib';
/**
 * Cross-Origin Resource Sharing middleware. Adds the appropriate CORS
 * headers to every response and handles preflight OPTIONS requests.
 */
export class CORSMiddleware {
    allowOrigins;
    allowMethods;
    allowHeaders;
    allowCredentials;
    maxAge;
    constructor(options = {}) {
        this.allowOrigins = options.allowOrigins ?? ['*'];
        this.allowMethods = options.allowMethods ?? [
            'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS',
        ];
        this.allowHeaders = options.allowHeaders ?? ['*'];
        this.allowCredentials = options.allowCredentials ?? false;
        this.maxAge = options.maxAge ?? 600;
    }
    async process(_request, _next) {
        // This is a placeholder — the real processing happens at the raw level.
        // See CORSMiddleware.processRaw() used internally by the application.
        return _next();
    }
    /** Process at the raw request/response level (used internally). */
    async processRaw(requestData, callNext) {
        const origin = getHeaderValue(requestData.headers, 'origin');
        if (requestData.method === 'OPTIONS') {
            return {
                status: 204,
                headers: this._corsHeaders(origin),
                body: Buffer.alloc(0),
            };
        }
        const response = await callNext(requestData);
        response.headers = [
            ...response.headers,
            ...this._corsHeaders(origin),
        ];
        return response;
    }
    _corsHeaders(requestOrigin) {
        let allowedOrigin;
        if (this.allowOrigins.includes('*')) {
            allowedOrigin = this.allowCredentials
                ? (requestOrigin ?? '*')
                : '*';
        }
        else if (requestOrigin && this.allowOrigins.includes(requestOrigin)) {
            allowedOrigin = requestOrigin;
        }
        else {
            allowedOrigin = this.allowOrigins[0] ?? '';
        }
        const headers = [
            ['access-control-allow-origin', allowedOrigin],
            ['access-control-allow-methods', this.allowMethods.join(', ')],
            ['access-control-allow-headers', this.allowHeaders.join(', ')],
            ['access-control-max-age', String(this.maxAge)],
        ];
        if (this.allowCredentials) {
            headers.push(['access-control-allow-credentials', 'true']);
        }
        if (!this.allowOrigins.includes('*')) {
            headers.push(['vary', 'Origin']);
        }
        return headers;
    }
}
/**
 * GZip compression middleware. Compresses response bodies that exceed
 * the minimum size threshold when the client supports gzip encoding.
 */
export class GZipMiddleware {
    minimumSize;
    constructor(options = {}) {
        this.minimumSize = options.minimumSize ?? 500;
    }
    async process(_request, _next) {
        return _next();
    }
    async processRaw(requestData, callNext) {
        const response = await callNext(requestData);
        const body = response.body;
        if (body.length < this.minimumSize)
            return response;
        const acceptEncoding = getHeaderValue(requestData.headers, 'accept-encoding') ?? '';
        if (!acceptEncoding.toLowerCase().includes('gzip'))
            return response;
        const compressed = gzipSync(body);
        if (compressed.length >= body.length)
            return response;
        response.body = compressed;
        response.headers = [
            ...response.headers.filter(([k]) => k.toLowerCase() !== 'content-length'),
            ['content-encoding', 'gzip'],
            ['vary', 'Accept-Encoding'],
        ];
        return response;
    }
}
/**
 * Adds a unique request ID to every response. If the incoming request
 * already has the header, its value is forwarded.
 */
export class RequestIdMiddleware {
    headerName;
    constructor(options = {}) {
        this.headerName = options.headerName ?? 'x-request-id';
    }
    async process(_request, _next) {
        return _next();
    }
    async processRaw(requestData, callNext) {
        const incomingId = getHeaderValue(requestData.headers, this.headerName);
        const requestId = incomingId ?? randomUUID().replace(/-/g, '');
        const response = await callNext(requestData);
        response.headers = [...response.headers, [this.headerName, requestId]];
        return response;
    }
}
/**
 * Rejects requests whose Host header is not in the allowed list.
 */
export class TrustedHostMiddleware {
    allowedHosts;
    constructor(options = {}) {
        this.allowedHosts = new Set((options.allowedHosts ?? ['*']).map((h) => h.toLowerCase()));
    }
    async process(_request, _next) {
        return _next();
    }
    async processRaw(requestData, callNext) {
        if (this.allowedHosts.has('*')) {
            return callNext(requestData);
        }
        const hostHeader = getHeaderValue(requestData.headers, 'host') ?? '';
        const host = hostHeader.split(':')[0].toLowerCase();
        if (!this.allowedHosts.has(host)) {
            return {
                status: 400,
                headers: [['content-type', 'application/json']],
                body: Buffer.from(JSON.stringify({ detail: 'Invalid host header' })),
            };
        }
        return callNext(requestData);
    }
}
// ── Helpers ──
function getHeaderValue(headers, name) {
    const target = name.toLowerCase();
    for (const [k, v] of headers) {
        if (k.toLowerCase() === target)
            return v;
    }
    return undefined;
}
/**
 * Adapt a raw middleware function (operating on raw dicts) from a built-in
 * middleware class that exposes a `processRaw` method.
 */
export function toRawMiddleware(mw) {
    const processRaw = mw.processRaw;
    if (typeof processRaw === 'function') {
        return processRaw.bind(mw);
    }
    return null;
}
//# sourceMappingURL=middleware.js.map