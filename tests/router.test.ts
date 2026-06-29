import { describe, it, expect } from 'vitest';
import { Rivex } from '../src/application.js';
import { Router } from '../src/router.js';
import { Controller, Get, Post, Delete } from '../src/controller.js';
import { TestClient } from '../src/testing.js';

describe('Router', () => {
  it('should register routes with a prefix', () => {
    const router = new Router({ prefix: '/api' });
    const handler = async () => ({});

    router.get('/users', handler);
    router.post('/users', handler);

    expect(router._routes).toHaveLength(2);
    expect(router._routes[0].path).toBe('/api/users');
    expect(router._routes[0].method).toBe('GET');
    expect(router._routes[1].path).toBe('/api/users');
    expect(router._routes[1].method).toBe('POST');
  });

  it('should apply tags to all routes', () => {
    const router = new Router({ prefix: '/api', tags: ['api'] });

    router.get('/items', async () => ({}));
    router.get('/items/{id}', async () => ({}), { tags: ['items'] });

    expect(router._routes[0].options.tags).toEqual(['api']);
    expect(router._routes[1].options.tags).toEqual(['api', 'items']);
  });

  it('should include another router', () => {
    const v1 = new Router({ prefix: '/v1', tags: ['v1'] });
    v1.get('/health', async () => ({}));

    const api = new Router({ prefix: '/api' });
    api.includeRouter(v1);

    expect(api._routes).toHaveLength(1);
    expect(api._routes[0].path).toBe('/api/v1/health');
    expect(api._routes[0].options.tags).toContain('v1');
  });

  it('should include a router with extra prefix and tags', () => {
    const items = new Router({ prefix: '/items' });
    items.get('/', async () => ({}));

    const api = new Router({ prefix: '/api' });
    api.includeRouter(items, { prefix: '/v2', tags: ['v2'] });

    expect(api._routes).toHaveLength(1);
    expect(api._routes[0].path).toBe('/api/v2/items');
    expect(api._routes[0].options.tags).toContain('v2');
  });

  it('should nest routers in the application', async () => {
    const app = new Rivex();
    const router = new Router({ prefix: '/api/v1' });

    router.get('/hello', async () => ({ message: 'from router' }));

    app.includeRouter(router);

    const client = new TestClient(app);
    const response = await client.get('/api/v1/hello');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'from router' });
  });

  it('should support all HTTP methods', () => {
    const router = new Router();
    const handler = async () => ({});

    router.get('/a', handler);
    router.post('/b', handler);
    router.put('/c', handler);
    router.delete('/d', handler);
    router.patch('/e', handler);
    router.head('/f', handler);
    router.options('/g', handler);

    const methods = router._routes.map((r) => r.method);
    expect(methods).toEqual([
      'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS',
    ]);
  });

  it('should support route chaining', () => {
    const router = new Router();
    const handler = async () => ({});

    const result = router
      .get('/a', handler)
      .post('/b', handler)
      .put('/c', handler);

    expect(result).toBe(router);
    expect(router._routes).toHaveLength(3);
  });
});

describe('Controller', () => {
  it('should register routes via decorators', async () => {
    class UsersController extends Controller {
      static path = '/users';
      static tags = ['users'];

      @Get('/')
      async list() {
        return [{ id: 1, name: 'Alice' }];
      }

      @Get('/{id}')
      async getOne() {
        return { id: 1, name: 'Alice' };
      }

      @Post('/', { statusCode: 201 })
      async create() {
        return { id: 2, name: 'Bob' };
      }

      @Delete('/{id}')
      async remove() {
        return null;
      }
    }

    const app = new Rivex();
    app.includeController(UsersController);

    expect(app._routes).toHaveLength(4);
    expect(app._routes[0].path).toBe('/users');
    expect(app._routes[0].method).toBe('GET');
    expect(app._routes[1].path).toBe('/users/{id}');
    expect(app._routes[2].method).toBe('POST');
    expect(app._routes[2].options.statusCode).toBe(201);
    expect(app._routes[3].method).toBe('DELETE');

    // All routes should have the controller's tags
    for (const route of app._routes) {
      expect(route.options.tags).toContain('users');
    }
  });

  it('should work with TestClient', async () => {
    class ItemsController extends Controller {
      static path = '/items';

      @Get('/')
      async listItems() {
        return [{ id: 1 }, { id: 2 }];
      }

      @Get('/{id}')
      async getItem(ctx: { params: Record<string, string> }) {
        return { id: ctx.params.id };
      }
    }

    const app = new Rivex();
    app.includeController(ItemsController);

    const client = new TestClient(app);

    const listResp = await client.get('/items');
    expect(listResp.statusCode).toBe(200);
    expect(listResp.json()).toEqual([{ id: 1 }, { id: 2 }]);

    const getResp = await client.get('/items/42');
    expect(getResp.statusCode).toBe(200);
    expect(getResp.json()).toEqual({ id: '42' });
  });

  it('should include controller with extra prefix and tags', () => {
    class PingController extends Controller {
      static path = '/ping';
      static tags = ['internal'];

      @Get('/')
      async ping() {
        return { pong: true };
      }
    }

    const app = new Rivex();
    app.includeController(PingController, {
      prefix: '/api/v1',
      tags: ['v1'],
    });

    expect(app._routes).toHaveLength(1);
    expect(app._routes[0].path).toBe('/api/v1/ping');
    expect(app._routes[0].options.tags).toContain('v1');
    expect(app._routes[0].options.tags).toContain('internal');
  });
});
