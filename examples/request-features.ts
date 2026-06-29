import {
  Rivex,
  Controller,
  Get,
  Post,
  Dependency,
  Depends,
  HTTPException,
  APIStatus,
  HTTPMethod,
  CORSMiddleware,
  RequestIdMiddleware,
} from 'rivex';
import type { Context, MiddlewareFunc } from 'rivex';
import { Request } from 'rivex';
import { Response } from 'rivex';

// ── App setup ──

const app = new Rivex({ title: 'Rivex Request Features' });

// ── Class-based dependency ──

class CurrentUser extends Dependency<{ id: number; name: string; style: string }> {
  resolve(ctx: Context) {
    const token = (ctx.request.header('authorization') ?? '').replace('Bearer ', '');
    if (token !== 'demo-token') {
      throw new HTTPException(APIStatus.UNAUTHORIZED, 'Invalid token');
    }
    return { id: 1, name: 'Ada', style: 'class' };
  }
}

// ── Function-based dependency ──

function getRequestUser(ctx: Context): { id: number; name: string; style: string } {
  const token = (ctx.request.header('authorization') ?? '').replace('Bearer ', '');
  if (token !== 'demo-token') {
    throw new HTTPException(APIStatus.UNAUTHORIZED, 'Invalid token');
  }
  return { id: 1, name: 'Ada', style: 'function' };
}

// ── Function-based middleware ──

const poweredByMiddleware: MiddlewareFunc = async (
  request: Request,
  next: () => Promise<Response>,
): Promise<Response> => {
  const response = await next();
  response.headers['x-middleware-style'] = 'function';
  return response;
};

app.middleware('http', poweredByMiddleware);

// ── Class-based middleware ──

app.use(RequestIdMiddleware);
app.use(CORSMiddleware, { allowOrigins: ['*'] });

// ── Routes with dependencies ──

app.get('/items/{itemId}', async (ctx) => {
  const itemId = Number(ctx.params.itemId);
  const q = ctx.request.queryParams.q as string | undefined;
  const limit = Number(ctx.request.queryParams.limit) || 10;

  return {
    method: HTTPMethod.GET,
    itemId,
    q: q ?? null,
    limit,
  };
}, {
  summary: 'Read an item',
  tags: ['items'],
});

app.post('/items', async (ctx) => {
  const item = ctx.request.json<{ name: string; price: number; inStock?: boolean }>();
  return item;
}, { statusCode: APIStatus.CREATED });

// ── Dependency injection via manual resolution ──

app.get('/me', async (ctx) => {
  const userDep = Depends(getRequestUser);
  // In a full integration the framework resolves this automatically.
  // For demonstration, resolve manually:
  const user = userDep.provider(ctx);
  return user;
});

app.get('/me/class', async (ctx) => {
  const dep = new CurrentUser();
  return dep.resolve(ctx);
});

// ── Controller example ──

class HealthController extends Controller {
  static path = '/health';
  static tags = ['health'];

  @Get('/')
  async check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('/ready')
  async ready() {
    return { ready: true };
  }

  @Post('/ping', { summary: 'Ping the service' })
  async ping() {
    return { pong: true };
  }
}

app.includeController(HealthController);

app.run('127.0.0.1', 8000);
