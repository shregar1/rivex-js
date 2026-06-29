import { describe, it, expect } from 'vitest';
import { Rivex } from '../src/application.js';
import { TestClient, TestResponse } from '../src/testing.js';
import { HTTPException } from '../src/exceptions.js';
import { Router } from '../src/router.js';
import { Headers } from '../src/request.js';
import { BackgroundTask, BackgroundTasks } from '../src/background.js';
import { APIKeyHeader, HTTPBearer, OAuth2PasswordBearer } from '../src/security.js';
import { UploadFile, parseMultipart } from '../src/uploads.js';
import { generateOpenAPI } from '../src/openapi.js';
import { APIStatus, HTTPMethod } from '../src/status.js';

describe('TestClient', () => {
  it('should send GET requests', async () => {
    const app = new Rivex();
    app.get('/', async () => ({ hello: 'world' }));

    const client = new TestClient(app);
    const resp = await client.get('/');

    expect(resp.statusCode).toBe(200);
    expect(resp.json()).toEqual({ hello: 'world' });
  });

  it('should send POST with JSON', async () => {
    const app = new Rivex();
    app.post('/echo', async (ctx) => ctx.request.json());

    const client = new TestClient(app);
    const resp = await client.post('/echo', {
      json: { name: 'test' },
    });

    expect(resp.statusCode).toBe(200);
    expect(resp.json()).toEqual({ name: 'test' });
  });

  it('should send PUT requests', async () => {
    const app = new Rivex();
    app.put('/items/{id}', async (ctx) => ({
      id: ctx.params.id,
      ...(ctx.request.json() as object),
    }));

    const client = new TestClient(app);
    const resp = await client.put('/items/5', {
      json: { name: 'updated' },
    });

    expect(resp.statusCode).toBe(200);
    expect(resp.json()).toEqual({ id: '5', name: 'updated' });
  });

  it('should send DELETE requests', async () => {
    const app = new Rivex();
    app.delete('/items/{id}', async () => null);

    const client = new TestClient(app);
    const resp = await client.delete('/items/5');

    expect(resp.statusCode).toBe(204);
  });

  it('should send PATCH requests', async () => {
    const app = new Rivex();
    app.patch('/items/{id}', async (ctx) => ({
      id: ctx.params.id,
      patched: true,
    }));

    const client = new TestClient(app);
    const resp = await client.patch('/items/3');

    expect(resp.statusCode).toBe(200);
    expect(resp.json()).toEqual({ id: '3', patched: true });
  });

  it('should send form data', async () => {
    const app = new Rivex();
    app.post('/login', async (ctx) => {
      const text = ctx.request.text();
      const params = new URLSearchParams(text);
      return {
        username: params.get('username'),
        password: params.get('password'),
      };
    });

    const client = new TestClient(app);
    const resp = await client.post('/login', {
      data: { username: 'admin', password: 'secret' },
    });

    expect(resp.json()).toEqual({ username: 'admin', password: 'secret' });
  });

  it('should handle raw body', async () => {
    const app = new Rivex();
    app.post('/raw', async (ctx) => ({
      received: ctx.request.text(),
    }));

    const client = new TestClient(app);
    const resp = await client.post('/raw', {
      body: 'raw body content',
    });

    expect(resp.json()).toEqual({ received: 'raw body content' });
  });

  it('should include custom headers', async () => {
    const app = new Rivex();
    app.get('/headers', async (ctx) => ({
      auth: ctx.request.header('authorization'),
      accept: ctx.request.header('accept'),
    }));

    const client = new TestClient(app);
    const resp = await client.get('/headers', {
      headers: {
        Authorization: 'Bearer token',
        Accept: 'application/json',
      },
    });

    expect(resp.json()).toEqual({
      auth: 'Bearer token',
      accept: 'application/json',
    });
  });

  it('should work with routers', async () => {
    const app = new Rivex();
    const router = new Router({ prefix: '/api' });

    router.get('/data', async () => ({ source: 'router' }));
    app.includeRouter(router);

    const client = new TestClient(app);
    const resp = await client.get('/api/data');

    expect(resp.statusCode).toBe(200);
    expect(resp.json()).toEqual({ source: 'router' });
  });

  it('should handle multiple path parameters', async () => {
    const app = new Rivex();
    app.get('/orgs/{orgId}/repos/{repoId}', async (ctx) => ({
      org: ctx.params.orgId,
      repo: ctx.params.repoId,
    }));

    const client = new TestClient(app);
    const resp = await client.get('/orgs/acme/repos/widget');

    expect(resp.json()).toEqual({ org: 'acme', repo: 'widget' });
  });
});

describe('TestResponse', () => {
  it('should parse JSON', async () => {
    const resp = new TestResponse(200, {}, Buffer.from('{"a":1}'));
    expect(resp.json()).toEqual({ a: 1 });
  });

  it('should return text', async () => {
    const resp = new TestResponse(200, {}, Buffer.from('hello'));
    expect(resp.text()).toBe('hello');
  });
});

describe('Headers', () => {
  it('should get values case-insensitively', () => {
    const headers = new Headers([
      ['Content-Type', 'application/json'],
      ['X-Custom', 'value'],
    ]);

    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('CONTENT-TYPE')).toBe('application/json');
    expect(headers.get('x-custom')).toBe('value');
  });

  it('should return default for missing headers', () => {
    const headers = new Headers([]);
    expect(headers.get('missing')).toBeUndefined();
    expect(headers.get('missing', 'default')).toBe('default');
  });

  it('should check existence', () => {
    const headers = new Headers([['X-Test', 'yes']]);
    expect(headers.has('x-test')).toBe(true);
    expect(headers.has('x-missing')).toBe(false);
  });

  it('should get all values', () => {
    const headers = new Headers([
      ['Set-Cookie', 'a=1'],
      ['Set-Cookie', 'b=2'],
    ]);
    expect(headers.getAll('set-cookie')).toEqual(['a=1', 'b=2']);
  });

  it('should set and delete headers', () => {
    const headers = new Headers([['X-Old', 'value']]);
    headers.set('X-New', 'new-value');
    expect(headers.get('x-new')).toBe('new-value');

    headers.delete('x-old');
    expect(headers.has('x-old')).toBe(false);
  });
});

describe('BackgroundTasks', () => {
  it('should run tasks', async () => {
    const results: number[] = [];
    const task = new BackgroundTask((n: unknown) => {
      results.push(n as number);
    }, 42);

    await task.run();
    expect(results).toEqual([42]);
  });

  it('should collect and run multiple tasks', async () => {
    const results: string[] = [];
    const tasks = new BackgroundTasks();

    tasks.addTask((msg: unknown) => { results.push(msg as string); }, 'first');
    tasks.addTask((msg: unknown) => { results.push(msg as string); }, 'second');

    expect(tasks.length).toBe(2);

    await tasks.runAll();
    expect(results).toEqual(['first', 'second']);
  });

  it('should handle async tasks', async () => {
    const results: string[] = [];
    const tasks = new BackgroundTasks();

    tasks.addTask(async (msg: unknown) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      results.push(msg as string);
    }, 'async-result');

    await tasks.runAll();
    expect(results).toEqual(['async-result']);
  });
});

describe('Security', () => {
  it('APIKeyHeader should extract API key', () => {
    const apiKey = new APIKeyHeader('x-api-key');
    const ctx = {
      request: {
        header: (name: string) =>
          name === 'x-api-key' ? 'my-key' : undefined,
      },
      params: {},
      state: new Map(),
    } as any;

    expect(apiKey.resolve(ctx)).toBe('my-key');
  });

  it('APIKeyHeader should throw when missing and autoError is true', () => {
    const apiKey = new APIKeyHeader('x-api-key');
    const ctx = {
      request: { header: () => undefined },
      params: {},
      state: new Map(),
    } as any;

    expect(() => apiKey.resolve(ctx)).toThrow();
  });

  it('APIKeyHeader should return null when missing and autoError is false', () => {
    const apiKey = new APIKeyHeader('x-api-key', { autoError: false });
    const ctx = {
      request: { header: () => undefined },
      params: {},
      state: new Map(),
    } as any;

    expect(apiKey.resolve(ctx)).toBeNull();
  });

  it('HTTPBearer should extract credentials', () => {
    const bearer = new HTTPBearer();
    const ctx = {
      request: {
        header: (name: string) =>
          name === 'authorization' ? 'Bearer mytoken' : undefined,
      },
      params: {},
      state: new Map(),
    } as any;

    const result = bearer.resolve(ctx);
    expect(result).toEqual({ scheme: 'Bearer', credentials: 'mytoken' });
  });

  it('OAuth2PasswordBearer should extract token', () => {
    const oauth = new OAuth2PasswordBearer('/token');
    const ctx = {
      request: {
        header: (name: string) =>
          name === 'authorization' ? 'Bearer access-token' : undefined,
      },
      params: {},
      state: new Map(),
    } as any;

    expect(oauth.resolve(ctx)).toBe('access-token');
  });

  it('OAuth2PasswordBearer should reject non-bearer schemes', () => {
    const oauth = new OAuth2PasswordBearer('/token');
    const ctx = {
      request: {
        header: (name: string) =>
          name === 'authorization' ? 'Basic abc123' : undefined,
      },
      params: {},
      state: new Map(),
    } as any;

    expect(() => oauth.resolve(ctx)).toThrow();
  });
});

describe('UploadFile', () => {
  it('should read file content', async () => {
    const content = Buffer.from('hello upload');
    const file = new UploadFile(content, {
      filename: 'test.txt',
      contentType: 'text/plain',
    });

    expect(file.filename).toBe('test.txt');
    expect(file.contentType).toBe('text/plain');
    expect(file.size).toBe(content.length);

    const data = await file.read();
    expect(data.toString()).toBe('hello upload');
  });

  it('should seek and read partial content', async () => {
    const content = Buffer.from('abcdefgh');
    const file = new UploadFile(content);

    file.seek(3);
    const data = await file.read(3);
    expect(data.toString()).toBe('def');
  });
});

describe('parseMultipart', () => {
  it('should parse simple multipart form data', () => {
    const boundary = '----FormBoundary';
    const body = Buffer.from(
      `------FormBoundary\r\n` +
      `Content-Disposition: form-data; name="field1"\r\n` +
      `\r\n` +
      `value1\r\n` +
      `------FormBoundary\r\n` +
      `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n` +
      `Content-Type: text/plain\r\n` +
      `\r\n` +
      `file content\r\n` +
      `------FormBoundary--\r\n`
    );

    const fields = parseMultipart(body, `multipart/form-data; boundary=${boundary}`);

    expect(fields.get('field1')).toEqual(['value1']);
    const fileField = fields.get('file');
    expect(fileField).toHaveLength(1);
    expect(fileField![0]).toBeInstanceOf(UploadFile);
    expect((fileField![0] as UploadFile).filename).toBe('test.txt');
  });
});

describe('OpenAPI generation', () => {
  it('should generate a basic spec', () => {
    const routes = [
      {
        method: 'GET',
        path: '/users',
        handler: async () => ({}),
        options: {
          statusCode: 200,
          tags: ['users'],
          deprecated: false,
          includeInSchema: true,
          summary: 'List users',
        },
      },
      {
        method: 'GET',
        path: '/users/{id}',
        handler: async () => ({}),
        options: {
          statusCode: 200,
          tags: ['users'],
          deprecated: false,
          includeInSchema: true,
        },
      },
    ];

    const spec = generateOpenAPI({
      title: 'Test API',
      version: '1.0.0',
      description: 'Test description',
      routes: routes as any,
    });

    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toBe('Test API');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.paths['/users']).toBeDefined();
    expect(spec.paths['/users'].get).toBeDefined();
    expect((spec.paths['/users'].get as any).summary).toBe('List users');
    expect(spec.paths['/users/{id}']).toBeDefined();

    // Should have path parameter for {id}
    const idOp = spec.paths['/users/{id}'].get as Record<string, any>;
    expect(idOp.parameters).toHaveLength(1);
    expect(idOp.parameters[0].name).toBe('id');
    expect(idOp.parameters[0].in).toBe('path');
  });

  it('should exclude routes with includeInSchema=false', () => {
    const routes = [
      {
        method: 'GET',
        path: '/public',
        handler: async () => ({}),
        options: {
          statusCode: 200,
          tags: [],
          deprecated: false,
          includeInSchema: true,
        },
      },
      {
        method: 'GET',
        path: '/internal',
        handler: async () => ({}),
        options: {
          statusCode: 200,
          tags: [],
          deprecated: false,
          includeInSchema: false,
        },
      },
    ];

    const spec = generateOpenAPI({
      title: 'Test',
      version: '1.0.0',
      routes: routes as any,
    });

    expect(spec.paths['/public']).toBeDefined();
    expect(spec.paths['/internal']).toBeUndefined();
  });
});

describe('Status codes and methods', () => {
  it('should export standard HTTP status values', () => {
    expect(APIStatus.OK).toBe(200);
    expect(APIStatus.CREATED).toBe(201);
    expect(APIStatus.NOT_FOUND).toBe(404);
    expect(APIStatus.INTERNAL_SERVER_ERROR).toBe(500);
  });

  it('should export HTTP methods', () => {
    expect(HTTPMethod.GET).toBe('GET');
    expect(HTTPMethod.POST).toBe('POST');
    expect(HTTPMethod.DELETE).toBe('DELETE');
  });
});

describe('HTTPException', () => {
  it('should have default phrases', () => {
    const exc404 = new HTTPException(404);
    expect(exc404.detail).toBe('Not Found');
    expect(exc404.message).toBe('Not Found');

    const exc500 = new HTTPException(500);
    expect(exc500.detail).toBe('Internal Server Error');
  });

  it('should accept custom detail', () => {
    const exc = new HTTPException(400, 'Invalid input');
    expect(exc.statusCode).toBe(400);
    expect(exc.detail).toBe('Invalid input');
  });

  it('should accept object detail', () => {
    const exc = new HTTPException(422, { errors: ['field required'] });
    expect(exc.detail).toEqual({ errors: ['field required'] });
  });

  it('should accept custom headers', () => {
    const exc = new HTTPException(401, 'Unauthorized', {
      'WWW-Authenticate': 'Bearer',
    });
    expect(exc.headers).toEqual({ 'WWW-Authenticate': 'Bearer' });
  });
});
