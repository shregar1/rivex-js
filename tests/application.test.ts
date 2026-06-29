import { describe, it, expect } from 'vitest';
import { Rivex } from '../src/application.js';
import { TestClient } from '../src/testing.js';
import { HTTPException } from '../src/exceptions.js';
import { JSONResponse, HTMLResponse, PlainTextResponse, RedirectResponse } from '../src/response.js';

describe('Rivex', () => {
  it('should create an app with default options', () => {
    const app = new Rivex();
    expect(app.title).toBe('Rivex');
    expect(app.version).toBe('0.1.0');
    expect(app.debug).toBe(false);
    expect(app.docsUrl).toBe('/docs');
    expect(app.openApiUrl).toBe('/openapi.json');
  });

  it('should create an app with custom options', () => {
    const app = new Rivex({
      title: 'Test API',
      version: '2.0.0',
      description: 'A test app',
      debug: true,
      docsUrl: null,
      openApiUrl: '/api/spec.json',
    });
    expect(app.title).toBe('Test API');
    expect(app.version).toBe('2.0.0');
    expect(app.description).toBe('A test app');
    expect(app.debug).toBe(true);
    expect(app.docsUrl).toBeNull();
    expect(app.openApiUrl).toBe('/api/spec.json');
  });

  it('should register routes with method shorthands', () => {
    const app = new Rivex();
    const handler = async () => ({});

    app.get('/a', handler);
    app.post('/b', handler);
    app.put('/c', handler);
    app.delete('/d', handler);
    app.patch('/e', handler);
    app.head('/f', handler);
    app.options('/g', handler);

    expect(app._routes).toHaveLength(7);
    expect(app._routes[0].method).toBe('GET');
    expect(app._routes[0].path).toBe('/a');
    expect(app._routes[1].method).toBe('POST');
    expect(app._routes[2].method).toBe('PUT');
    expect(app._routes[3].method).toBe('DELETE');
    expect(app._routes[4].method).toBe('PATCH');
    expect(app._routes[5].method).toBe('HEAD');
    expect(app._routes[6].method).toBe('OPTIONS');
  });

  it('should store route options', () => {
    const app = new Rivex();

    app.get('/test', async () => ({}), {
      statusCode: 201,
      tags: ['test'],
      summary: 'Test endpoint',
      description: 'Detailed description',
      deprecated: true,
    });

    const route = app._routes[0];
    expect(route.options.statusCode).toBe(201);
    expect(route.options.tags).toEqual(['test']);
    expect(route.options.summary).toBe('Test endpoint');
    expect(route.options.description).toBe('Detailed description');
    expect(route.options.deprecated).toBe(true);
  });

  it('should handle GET requests via TestClient', async () => {
    const app = new Rivex();
    app.get('/', async () => {
      return { message: 'Hello, World!' };
    });

    const client = new TestClient(app);
    const response = await client.get('/');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'Hello, World!' });
  });

  it('should handle POST with JSON body', async () => {
    const app = new Rivex();
    app.post('/items', async (ctx) => {
      const body = ctx.request.json<{ name: string }>();
      return { created: body.name };
    }, { statusCode: 201 });

    const client = new TestClient(app);
    const response = await client.post('/items', {
      json: { name: 'Widget' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ created: 'Widget' });
  });

  it('should extract path parameters', async () => {
    const app = new Rivex();
    app.get('/users/{userId}', async (ctx) => {
      return { userId: ctx.params.userId };
    });

    const client = new TestClient(app);
    const response = await client.get('/users/42');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: '42' });
  });

  it('should extract query parameters', async () => {
    const app = new Rivex();
    app.get('/search', async (ctx) => {
      return { q: ctx.request.queryParams.q };
    });

    const client = new TestClient(app);
    const response = await client.get('/search?q=hello');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ q: 'hello' });
  });

  it('should merge query params from options', async () => {
    const app = new Rivex();
    app.get('/search', async (ctx) => {
      return { q: ctx.request.queryParams.q, page: ctx.request.queryParams.page };
    });

    const client = new TestClient(app);
    const response = await client.get('/search', {
      params: { q: 'test', page: '2' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ q: 'test', page: '2' });
  });

  it('should return 404 for unknown routes', async () => {
    const app = new Rivex();
    const client = new TestClient(app);
    const response = await client.get('/nonexistent');

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: 'Not Found' });
  });

  it('should handle HTTPException', async () => {
    const app = new Rivex();
    app.get('/fail', async () => {
      throw new HTTPException(403, 'Access denied');
    });

    const client = new TestClient(app);
    const response = await client.get('/fail');

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ detail: 'Access denied' });
  });

  it('should handle HTTPException with custom headers', async () => {
    const app = new Rivex();
    app.get('/auth', async () => {
      throw new HTTPException(401, 'Unauthorized', {
        'WWW-Authenticate': 'Bearer',
      });
    });

    const client = new TestClient(app);
    const response = await client.get('/auth');

    expect(response.statusCode).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Bearer');
  });

  it('should handle generic errors in debug mode', async () => {
    const app = new Rivex({ debug: true });
    app.get('/error', async () => {
      throw new Error('Something broke');
    });

    const client = new TestClient(app);
    const response = await client.get('/error');

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ detail: 'Something broke' });
  });

  it('should hide error details in production mode', async () => {
    const app = new Rivex({ debug: false });
    app.get('/error', async () => {
      throw new Error('Secret error info');
    });

    const client = new TestClient(app);
    const response = await client.get('/error');

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ detail: 'Internal Server Error' });
  });

  it('should return 204 for null responses', async () => {
    const app = new Rivex();
    app.delete('/items/{id}', async () => {
      return null;
    });

    const client = new TestClient(app);
    const response = await client.delete('/items/1');

    expect(response.statusCode).toBe(204);
  });

  it('should return string responses as plain text', async () => {
    const app = new Rivex();
    app.get('/text', async () => {
      return 'Hello, plain text!';
    });

    const client = new TestClient(app);
    const response = await client.get('/text');

    expect(response.statusCode).toBe(200);
    expect(response.text()).toBe('Hello, plain text!');
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  it('should handle Response objects', async () => {
    const app = new Rivex();
    app.get('/json', async () => {
      return new JSONResponse({ data: true }, 201);
    });
    app.get('/html', async () => {
      return new HTMLResponse('<h1>Hello</h1>');
    });
    app.get('/plain', async () => {
      return new PlainTextResponse('OK');
    });

    const client = new TestClient(app);

    const jsonResp = await client.get('/json');
    expect(jsonResp.statusCode).toBe(201);
    expect(jsonResp.json()).toEqual({ data: true });

    const htmlResp = await client.get('/html');
    expect(htmlResp.statusCode).toBe(200);
    expect(htmlResp.text()).toBe('<h1>Hello</h1>');
    expect(htmlResp.headers['content-type']).toBe('text/html; charset=utf-8');

    const plainResp = await client.get('/plain');
    expect(plainResp.text()).toBe('OK');
  });

  it('should handle custom exception handlers', async () => {
    const app = new Rivex();

    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    app.exceptionHandler(CustomError, async (_ctx, error) => {
      return { custom: true, message: error.message };
    });

    app.get('/custom-error', async () => {
      throw new CustomError('Custom problem');
    });

    const client = new TestClient(app);
    const response = await client.get('/custom-error');

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ custom: true, message: 'Custom problem' });
  });

  it('should handle custom exception handler for HTTPException', async () => {
    const app = new Rivex();

    app.exceptionHandler(HTTPException, async (_ctx, error) => {
      return { handled: true, code: error.statusCode };
    });

    app.get('/http-error', async () => {
      throw new HTTPException(422, 'Validation failed');
    });

    const client = new TestClient(app);
    const response = await client.get('/http-error');

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ handled: true, code: 422 });
  });

  it('should support application state', () => {
    const app = new Rivex();
    app.state.dbPool = 'mock-pool';
    expect(app.state.dbPool).toBe('mock-pool');
  });

  it('should handle request headers', async () => {
    const app = new Rivex();
    app.get('/headers', async (ctx) => {
      return {
        auth: ctx.request.header('authorization'),
        custom: ctx.request.header('x-custom', 'default'),
      };
    });

    const client = new TestClient(app);
    const response = await client.get('/headers', {
      headers: { Authorization: 'Bearer token123' },
    });

    expect(response.json()).toEqual({
      auth: 'Bearer token123',
      custom: 'default',
    });
  });

  it('should handle lifecycle hooks', async () => {
    const log: string[] = [];
    const app = new Rivex();

    app.onEvent('startup', () => { log.push('started'); });
    app.onEvent('shutdown', () => { log.push('stopped'); });

    const client = new TestClient(app);
    const dispose = await client.start();
    expect(log).toEqual(['started']);

    await dispose();
    expect(log).toEqual(['started', 'stopped']);
  });
});
