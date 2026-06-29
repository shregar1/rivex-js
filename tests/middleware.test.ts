import { describe, it, expect } from 'vitest';
import { Rivex } from '../src/application.js';
import { TestClient } from '../src/testing.js';
import {
  CORSMiddleware,
  GZipMiddleware,
  RequestIdMiddleware,
  TrustedHostMiddleware,
} from '../src/middleware.js';
import type { Request } from '../src/request.js';
import type { Response } from '../src/response.js';

describe('CORSMiddleware', () => {
  it('should add CORS headers to responses', async () => {
    const app = new Rivex();
    app.use(CORSMiddleware, { allowOrigins: ['*'] });

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test', {
      headers: { origin: 'http://example.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-methods']).toContain('GET');
  });

  it('should reflect specific origin when credentials are allowed', async () => {
    const app = new Rivex();
    app.use(CORSMiddleware, {
      allowOrigins: ['*'],
      allowCredentials: true,
    });

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test', {
      headers: { origin: 'http://myapp.com' },
    });

    expect(response.headers['access-control-allow-origin']).toBe('http://myapp.com');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should handle specific allowed origins', async () => {
    const app = new Rivex();
    app.use(CORSMiddleware, {
      allowOrigins: ['http://allowed.com'],
    });

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test', {
      headers: { origin: 'http://allowed.com' },
    });

    expect(response.headers['access-control-allow-origin']).toBe('http://allowed.com');
    expect(response.headers['vary']).toBe('Origin');
  });
});

describe('RequestIdMiddleware', () => {
  it('should add a request ID header', async () => {
    const app = new Rivex();
    app.use(RequestIdMiddleware);

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test');

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id'].length).toBeGreaterThan(0);
  });

  it('should forward existing request ID', async () => {
    const app = new Rivex();
    app.use(RequestIdMiddleware);

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test', {
      headers: { 'x-request-id': 'my-custom-id' },
    });

    expect(response.headers['x-request-id']).toBe('my-custom-id');
  });

  it('should use a custom header name', async () => {
    const app = new Rivex();
    app.use(RequestIdMiddleware, { headerName: 'x-trace-id' });

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test');

    expect(response.headers['x-trace-id']).toBeDefined();
  });
});

describe('TrustedHostMiddleware', () => {
  it('should allow requests with valid hosts', async () => {
    const app = new Rivex();
    app.use(TrustedHostMiddleware, {
      allowedHosts: ['example.com'],
    });

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test', {
      headers: { host: 'example.com' },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should reject requests with invalid hosts', async () => {
    const app = new Rivex();
    app.use(TrustedHostMiddleware, {
      allowedHosts: ['example.com'],
    });

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test', {
      headers: { host: 'evil.com' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: 'Invalid host header' });
  });

  it('should allow all hosts with wildcard', async () => {
    const app = new Rivex();
    app.use(TrustedHostMiddleware, { allowedHosts: ['*'] });

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test', {
      headers: { host: 'anything.com' },
    });

    expect(response.statusCode).toBe(200);
  });
});

describe('GZipMiddleware', () => {
  it('should compress responses above minimum size', async () => {
    const app = new Rivex();
    app.use(GZipMiddleware, { minimumSize: 10 });

    app.get('/test', async () => {
      return { data: 'x'.repeat(1000) };
    });

    const client = new TestClient(app);
    const response = await client.get('/test', {
      headers: { 'accept-encoding': 'gzip, deflate' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.headers['vary']).toBe('Accept-Encoding');
  });

  it('should not compress small responses', async () => {
    const app = new Rivex();
    app.use(GZipMiddleware, { minimumSize: 10000 });

    app.get('/test', async () => {
      return { data: 'small' };
    });

    const client = new TestClient(app);
    const response = await client.get('/test', {
      headers: { 'accept-encoding': 'gzip' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('should not compress when client does not accept gzip', async () => {
    const app = new Rivex();
    app.use(GZipMiddleware, { minimumSize: 10 });

    app.get('/test', async () => {
      return { data: 'x'.repeat(1000) };
    });

    const client = new TestClient(app);
    const response = await client.get('/test');

    expect(response.headers['content-encoding']).toBeUndefined();
  });
});

describe('Function-based middleware', () => {
  it('should intercept requests and responses', async () => {
    const app = new Rivex();

    app.middleware('http', async (request: Request, next: () => Promise<Response>) => {
      const response = await next();
      response.headers['x-custom'] = 'middleware-value';
      return response;
    });

    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const response = await client.get('/test');

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-custom']).toBe('middleware-value');
  });

  it('should stack multiple middleware in order', async () => {
    const app = new Rivex();
    const order: string[] = [];

    app.middleware('http', async (_request: Request, next: () => Promise<Response>) => {
      order.push('mw1-before');
      const response = await next();
      order.push('mw1-after');
      return response;
    });

    app.middleware('http', async (_request: Request, next: () => Promise<Response>) => {
      order.push('mw2-before');
      const response = await next();
      order.push('mw2-after');
      return response;
    });

    app.get('/test', async () => {
      order.push('handler');
      return { ok: true };
    });

    const client = new TestClient(app);
    await client.get('/test');

    expect(order).toEqual([
      'mw1-before',
      'mw2-before',
      'handler',
      'mw2-after',
      'mw1-after',
    ]);
  });
});
