const DEFAULT_PHRASES: Record<number, string> = {
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
  readonly statusCode: number;
  readonly detail: unknown;
  readonly headers?: Record<string, string>;

  constructor(
    statusCode: number,
    detail?: unknown,
    headers?: Record<string, string>,
  ) {
    const resolvedDetail =
      detail !== undefined ? detail : DEFAULT_PHRASES[statusCode] ?? 'Error';
    super(typeof resolvedDetail === 'string' ? resolvedDetail : JSON.stringify(resolvedDetail));
    this.name = 'HTTPException';
    this.statusCode = statusCode;
    this.detail = resolvedDetail;
    this.headers = headers;
  }
}
