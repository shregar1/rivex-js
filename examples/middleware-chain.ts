import { Rivex, CORSMiddleware, RequestIdMiddleware } from 'rivex';
import type { MiddlewareFunc } from 'rivex';

let requestCounter = 0;

const requestLogger: MiddlewareFunc = async (request, next) => {
  const start = Date.now();
  const response = await next();
  const ms = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.path} -> ${ms}ms`);
  return response;
};

const requestCounterMW: MiddlewareFunc = async (_request, next) => {
  const id = ++requestCounter;
  const response = await next();
  response.headers['x-request-num'] = String(id);
  return response;
};

const app = new Rivex({ title: 'Middleware Chain Example' });

app.middleware('http', requestLogger);
app.middleware('http', requestCounterMW);
app.use(RequestIdMiddleware);
app.use(CORSMiddleware, { allowOrigins: ['*'] });

app.get('/', async () => {
  return { message: 'middleware chain ran' };
});

app.get('/slow', async () => {
  await new Promise((r) => setTimeout(r, 100));
  return { message: 'slept 100ms' };
});

app.run('127.0.0.1', 8000);
