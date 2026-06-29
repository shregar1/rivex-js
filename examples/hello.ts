import { Rivex } from 'rivex';

const app = new Rivex({ title: 'Hello API' });

app.get('/', async () => {
  return { message: 'Hello from Rivex!' };
});

app.get('/hello/{name}', async (ctx) => {
  const name = ctx.params.name;
  const greeting = (ctx.request.queryParams.greeting as string) || 'Hello';
  return { message: `${greeting}, ${name}!` };
});

app.get('/add', async (ctx) => {
  const a = Number(ctx.request.queryParams.a) || 0;
  const b = Number(ctx.request.queryParams.b) || 0;
  return { result: a + b };
});

app.run('127.0.0.1', 8000);
