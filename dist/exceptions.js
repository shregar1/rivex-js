const DEFAULT_PHRASES = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
};
/**
 * HTTP exception that can be thrown from any handler or middleware to
 * short-circuit processing and return an error response.
 */
export class HTTPException extends Error {
    statusCode;
    detail;
    headers;
    constructor(statusCode, detail, headers) {
        const resolvedDetail = detail !== undefined ? detail : DEFAULT_PHRASES[statusCode] ?? 'Error';
        super(typeof resolvedDetail === 'string' ? resolvedDetail : JSON.stringify(resolvedDetail));
        this.name = 'HTTPException';
        this.statusCode = statusCode;
        this.detail = resolvedDetail;
        this.headers = headers;
    }
}
//# sourceMappingURL=exceptions.js.map