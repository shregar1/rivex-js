// Demonstrates the in-process TestClient.
//
// Run with: npx tsx examples/testing-demo.ts
//
// Builds a tiny Rivex app and exercises it without starting a real
// server, the same pattern you'd use from a vitest spec.

import { Rivex, TestClient, HTTPException, APIStatus } from 'rivex';

function buildApp() {
  const app = new Rivex({ title: 'Testing Demo' });

  app.get('/hello/{name}', async (ctx) => {
    return { message: `Hello, ${ctx.params.name}!` };
  });

  app.post('/echo', async (ctx) => {
    try {
      return ctx.request.json<Record<string, unknown>>();
    } catch {
      throw new HTTPException(APIStatus.BAD_REQUEST, 'invalid json');
    }
  });

  return app;
}

async function main() {
  const app = buildApp();
  const client = new TestClient(app);

  const hello = await client.get('/hello/Ada');
  console.log(`GET /hello/Ada -> ${hello.statusCode}`);
  console.log(`  body=${hello.text()}`);

  const echo = await client.post('/echo', { json: { hi: 'there' } });
  console.log(`POST /echo -> ${echo.statusCode}`);
  console.log(`  body=${echo.text()}`);

  const missing = await client.get('/does-not-exist');
  console.log(`GET /does-not-exist -> ${missing.statusCode}`);
}

void main();
