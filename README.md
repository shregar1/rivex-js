# Rivex

**A Rust-powered TypeScript/JavaScript web framework with full type safety and FastAPI-like ergonomics.**

[![npm](https://img.shields.io/npm/v/rivex.svg)](https://www.npmjs.com/package/rivex)
[![TypeScript](https://img.shields.io/badge/typescript-5.9%2B-blue.svg)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Rivex is a thin, idiomatic TypeScript binding over a shared **Rust core** (Hyper + Tokio via N-API). You write ordinary `async` handlers and get a FastAPI-style developer experience — method-based routing, class controllers with decorators, dependency injection, middleware, security helpers, automatic OpenAPI — while the HTTP runtime itself runs in native Rust.

```ts
import { Rivex } from 'rivex';

const app = new Rivex({ title: 'Hello API' });

app.get('/', async () => {
  return { message: 'Hello from Rivex!' };
});

app.run('127.0.0.1', 8000);
```

---

## Why Rivex

- **Rust-powered runtime.** The HTTP server is a compiled Rust core (Hyper/Tokio) loaded through N-API. Your TypeScript handlers run on top of it, so routing and raw I/O stay fast and consistent.
- **End-to-end type safety.** Written in strict TypeScript with complete type definitions. `Request.json<T>()`, typed `RouteOptions`, typed `Context`, and typed dependencies give you compile-time confidence over your API surface.
- **Batteries included.** Routing, path/query parsing, request-body access, a full `Response` hierarchy, built-in middleware (CORS, GZip, RequestID, TrustedHost), dependency injection, security helpers, background tasks, file uploads, OpenAPI 3.1 generation, and an in-process `TestClient` — all in one package.
- **FastAPI-like ergonomics.** If you've used FastAPI in Python, the mental model carries over directly: `app.get(...)`, `Depends()`, `HTTPException`, `Router(prefix=...)`, `APIRouter`, and a `FastAPI` alias for `Rivex`.
- **One core, many languages.** The same Rust core backs the Python, Go, and Ruby SDKs, so behavior is consistent across the ecosystem.

---

## Requirements

| Requirement | Version |
| --- | --- |
| Node.js | `>= 20` |
| TypeScript (for typed usage) | `5.9+` recommended |
| Native runtime (`app.run`) | `rivex-native` N-API binary (optional dependency) |

The TypeScript SDK runs on its own for everything except starting a live server. Calling `app.run()` requires the native Rust runtime — provided by the optional `rivex-native` package or a bundled `native/rivex-native.node` binary. Route definition, middleware, dependency resolution, OpenAPI generation, and the `TestClient` all work without it.

---

## Installation

```bash
npm install rivex
```

Using another package manager:

```bash
pnpm add rivex
# or
yarn add rivex
```

The native runtime is declared as an **optional dependency** (`rivex-native`) and is pulled in automatically when a prebuilt binary is available for your platform.

To run `.ts` example files directly during development, install [`tsx`](https://github.com/privatenumber/tsx):

```bash
npm install -D tsx
```

---

## Quickstart

Create `hello.ts`:

```ts
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
```

Run it:

```bash
npx tsx hello.ts
```

Then:

```bash
curl http://127.0.0.1:8000/
# {"message":"Hello from Rivex!"}

curl 'http://127.0.0.1:8000/hello/Ada?greeting=Hi'
# {"message":"Hi, Ada!"}

curl 'http://127.0.0.1:8000/add?a=2&b=3'
# {"result":5}
```

If the OpenAPI URL is enabled (default `/openapi.json`), interactive docs are served at `/docs`.

---

## Core concepts

### Routing

Register routes with the HTTP-method shorthands on the app. Each takes a path, an `async` handler, and optional `RouteOptions`. The methods are chainable.

```ts
app.get('/users/{userId}', async (ctx) => {
  return { id: ctx.params.userId };
});

app.post('/users', async (ctx) => {
  const body = ctx.request.json();
  return body;
}, { statusCode: 201 });
```

Available methods: `get`, `post`, `put`, `delete`, `patch`, `head`, `options`.

A handler can return any JSON-serializable value (object/array → JSON), a `string` (→ `text/plain`), a `Buffer` (→ `application/octet-stream`), `null`/`undefined` (→ `204 No Content`), or a `Response` instance (see below).

`RouteOptions` controls per-route behavior and OpenAPI metadata:

| Option | Type | Purpose |
| --- | --- | --- |
| `statusCode` | `number` | Default success status (defaults to `200`). |
| `tags` | `string[]` | OpenAPI tags. |
| `summary` | `string` | OpenAPI operation summary. |
| `description` | `string` | OpenAPI operation description. |
| `operationId` | `string` | OpenAPI operation id. |
| `deprecated` | `boolean` | Mark the operation deprecated. |
| `includeInSchema` | `boolean` | Exclude from the generated schema when `false`. |
| `responseModel` | `unknown` | Response model hint for the schema. |
| `openApiExtra` | `Record<string, unknown>` | Arbitrary extra OpenAPI fields. |

### Path and query parameters

Path parameters use `{name}` syntax and arrive as strings on `ctx.params`. Query parameters are parsed lazily from `ctx.request.queryParams` (multi-value keys become arrays).

```ts
app.get('/items/{itemId}', async (ctx) => {
  const itemId = Number(ctx.params.itemId);
  const q = ctx.request.queryParams.q as string | undefined;
  const limit = Number(ctx.request.queryParams.limit) || 10;
  return { itemId, q: q ?? null, limit };
});
```

The request also exposes `ctx.request.cookies`, `ctx.request.header(name)`, `ctx.request.url`, `ctx.request.contentType`, and the raw `ctx.request.headers` collection (a case-insensitive `Headers` object).

### Request bodies

Read and parse the body off `ctx.request`. `json<T>()` parses JSON with a caller-supplied type; `text()` returns the raw UTF-8 string; `body` is the raw `Buffer`.

```ts
interface TodoCreate {
  title: string;
  completed?: boolean;
}

app.post('/todos', async (ctx) => {
  const body = ctx.request.json<TodoCreate>();
  return {
    id: 1,
    title: body.title,
    completed: body.completed ?? false,
  };
}, { statusCode: 201 });
```

> Validation is not automatic — Rivex gives you typed access to the parsed body and you assert the shape you need (or throw `HTTPException` on bad input). The package also ships standalone validators (`validateEmail`, `validateUrl`, `validateUuid`, …) you can use inside handlers.

### Responses

Return plain values for the common case, or use the `Response` classes for full control over status, headers, and media type.

```ts
import {
  JSONResponse,
  HTMLResponse,
  PlainTextResponse,
  RedirectResponse,
  StreamingResponse,
} from 'rivex';

app.get('/json', async () => new JSONResponse({ ok: true }, 200));
app.get('/page', async () => new HTMLResponse('<h1>Hi</h1>'));
app.get('/text', async () => new PlainTextResponse('pong'));
app.get('/old', async () => new RedirectResponse('/new')); // 307 by default

app.get('/stream', async () => {
  async function* chunks() {
    yield 'one\n';
    yield 'two\n';
  }
  return new StreamingResponse(chunks(), 200, {}, 'text/plain');
});
```

`StreamingResponse` accepts an async iterable or a `ReadableStream` of `string`/`Buffer` chunks.

### Routers

Group related routes under a shared prefix and tag set with `Router` (aliased as `APIRouter`), then mount them with `app.includeRouter()`. Routers can be nested and can include controllers.

```ts
import { Rivex, Router, HTTPException, CORSMiddleware } from 'rivex';

const app = new Rivex({ title: 'Todo API', debug: true });
app.use(CORSMiddleware, { allowOrigins: ['*'] });

const router = new Router({ prefix: '/api/v1' });

router.get('/todos', async () => Array.from(db.values()));

router.get('/todos/{todoId}', async (ctx) => {
  const todo = db.get(Number(ctx.params.todoId));
  if (!todo) throw new HTTPException(404, 'Todo not found');
  return todo;
});

app.includeRouter(router);
app.run('127.0.0.1', 8000);
```

`app.includeRouter(router, { prefix, tags })` and `router.includeRouter(other, { prefix, tags })` merge prefixes and tags as they go.

### Class-based controllers

Prefer classes? Extend `Controller`, set a static `path`/`tags`, and decorate methods with `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Head`, `@Options`. Mount with `app.includeController()`.

```ts
import { Rivex, Controller, Get, Post } from 'rivex';

const app = new Rivex();

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
```

> Decorators require `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` in your `tsconfig.json` (these are already set in this repo's config).

### Middleware

Two styles, both supported and stackable. Middleware registered first runs first (outermost).

**Function middleware** — the `(request, next)` pattern, registered via `app.middleware('http', fn)`:

```ts
import type { MiddlewareFunc } from 'rivex';

const requestLogger: MiddlewareFunc = async (request, next) => {
  const start = Date.now();
  const response = await next();
  console.log(`${request.method} ${request.path} -> ${Date.now() - start}ms`);
  return response;
};

app.middleware('http', requestLogger);
```

**Class middleware** — built-ins added via `app.use(MiddlewareClass, options)`:

```ts
import {
  CORSMiddleware,
  GZipMiddleware,
  RequestIdMiddleware,
  TrustedHostMiddleware,
} from 'rivex';

app.use(CORSMiddleware, { allowOrigins: ['*'] });
app.use(GZipMiddleware, { minimumSize: 500 });
app.use(RequestIdMiddleware);                       // adds x-request-id
app.use(TrustedHostMiddleware, { allowedHosts: ['example.com'] });
```

| Middleware | Key options | Effect |
| --- | --- | --- |
| `CORSMiddleware` | `allowOrigins`, `allowMethods`, `allowHeaders`, `allowCredentials`, `maxAge` | Adds CORS headers, answers preflight `OPTIONS`. |
| `GZipMiddleware` | `minimumSize` | Gzips responses over the threshold when the client accepts gzip. |
| `RequestIdMiddleware` | `headerName` (default `x-request-id`) | Stamps each response with a request id, forwarding an incoming one if present. |
| `TrustedHostMiddleware` | `allowedHosts` | Rejects requests whose `Host` is not allowed (`400`). |

### Dependency injection

Declare reusable dependencies as plain functions `(ctx) => value` or as `Dependency` subclasses, and wrap them with `Depends()`. `Depends()` caches the resolved value per request by default (`{ useCache: false }` to disable).

```ts
import { Rivex, Dependency, Depends, HTTPException, APIStatus } from 'rivex';
import type { Context } from 'rivex';

// Function-based dependency
function getRequestUser(ctx: Context) {
  const token = (ctx.request.header('authorization') ?? '').replace('Bearer ', '');
  if (token !== 'demo-token') {
    throw new HTTPException(APIStatus.UNAUTHORIZED, 'Invalid token');
  }
  return { id: 1, name: 'Ada' };
}

// Class-based dependency
class CurrentUser extends Dependency<{ id: number; name: string }> {
  resolve(ctx: Context) {
    const token = (ctx.request.header('authorization') ?? '').replace('Bearer ', '');
    if (token !== 'demo-token') {
      throw new HTTPException(APIStatus.UNAUTHORIZED, 'Invalid token');
    }
    return { id: 1, name: 'Ada' };
  }
}

const userDep = Depends(getRequestUser);

app.get('/me', async (ctx) => {
  return userDep.provider(ctx);
});

app.get('/me/class', async (ctx) => {
  return new CurrentUser().resolve(ctx);
});
```

### Security helpers

`APIKeyHeader`, `HTTPBearer`, and `OAuth2PasswordBearer` extract credentials from the request and (by default) raise an `HTTPException` when authentication is missing or malformed. They pair naturally with dependencies.

```ts
import { Rivex, HTTPBearer, HTTPException, APIStatus } from 'rivex';
import type { Context } from 'rivex';

const bearer = new HTTPBearer();

function currentUser(ctx: Context) {
  const creds = bearer.resolve(ctx); // { scheme, credentials }
  if (!creds) throw new HTTPException(APIStatus.UNAUTHORIZED, 'Missing bearer token');
  const user = users[creds.credentials];
  if (!user) throw new HTTPException(APIStatus.UNAUTHORIZED, 'Invalid bearer token');
  return user;
}

app.get('/me', async (ctx) => currentUser(ctx));

app.get('/admin', async (ctx) => {
  const user = currentUser(ctx);
  if (user.role !== 'admin') {
    throw new HTTPException(APIStatus.FORBIDDEN, 'Admins only');
  }
  return { message: 'welcome to the admin panel', user };
});
```

Each helper accepts `{ autoError, schemeName }`; `APIKeyHeader` takes the header name, and `OAuth2PasswordBearer` takes the `tokenUrl`. Set `autoError: false` to get `null` instead of a thrown exception.

### Error handling

Throw `HTTPException(statusCode, detail?, headers?)` from any handler, dependency, or middleware to short-circuit with a structured JSON error (`{ "detail": ... }`). When `detail` is omitted, a default reason phrase is used.

```ts
import { HTTPException } from 'rivex';

app.get('/todos/{id}', async (ctx) => {
  const todo = db.get(Number(ctx.params.id));
  if (!todo) throw new HTTPException(404, 'Todo not found');
  return todo;
});
```

Register custom handlers for specific error classes with `app.exceptionHandler()`. The most specific matching class wins.

```ts
class PaymentRequiredError extends Error {}

app.exceptionHandler(PaymentRequiredError, async (ctx, err) => {
  return new JSONResponse({ error: err.message }, 402);
});
```

With `new Rivex({ debug: true })`, unhandled errors return the real message instead of a generic `Internal Server Error`.

### Status codes and enums

Import numeric constants (`HTTP_200_OK`, `HTTP_404_NOT_FOUND`, …) or the `APIStatus` / `HTTPMethod` enums for readable, typed values.

```ts
import { APIStatus, HTTPMethod, HTTP_201_CREATED } from 'rivex';

app.post('/items', async (ctx) => ctx.request.json(), {
  statusCode: APIStatus.CREATED, // 201
});

console.log(HTTPMethod.GET);     // 'GET'
console.log(HTTP_201_CREATED);   // 201
```

### Background tasks

Queue work to run after the response with `BackgroundTasks`.

```ts
import { BackgroundTasks, APIStatus } from 'rivex';

app.post('/signup/{email}', async (ctx) => {
  const email = ctx.params.email;
  const tasks = new BackgroundTasks();

  tasks.addTask(async () => sendWelcomeEmail(email));
  tasks.addTask(async () => provisionWorkspace(email));

  void tasks.runAll(); // fire-and-forget; errors are logged to stderr

  return { status: 'accepted', email };
}, { statusCode: APIStatus.ACCEPTED });
```

### File uploads

Parse `multipart/form-data` bodies with `parseMultipart`, which returns a map of field names to values (`UploadFile` for files, `string` for plain fields).

```ts
import { parseMultipart, UploadFile } from 'rivex';

app.post('/upload', async (ctx) => {
  const fields = parseMultipart(ctx.request.body, ctx.request.contentType ?? '');
  const file = fields.get('file')?.[0];
  if (file instanceof UploadFile) {
    const bytes = await file.read();
    return { filename: file.filename, size: bytes.length };
  }
  return { uploaded: false };
});
```

### OpenAPI

Routes are introspected into an OpenAPI 3.1 document. By default it is served at `/openapi.json` with Swagger UI at `/docs`; both are configurable via `RivexOptions` (`openApiUrl`, `docsUrl`, `openApiTags`, `servers`, `contact`, `licenseInfo`, …). You can also generate the spec directly:

```ts
import { generateOpenAPI } from 'rivex';

const spec = generateOpenAPI({
  title: app.title,
  version: app.version,
  routes: app._routes,
});
```

### Lifecycle hooks

Run setup/teardown logic with `app.onEvent('startup' | 'shutdown', fn)`.

```ts
app.onEvent('startup', async () => {
  await connectDatabase();
});

app.onEvent('shutdown', async () => {
  await closeDatabase();
});
```

### Extra utilities

The package re-exports a broad set of helpers backed by the same core, useful inside handlers — among them:

- **Hashing & crypto:** `hashPassword`, `verifyPassword`, `sha256`, `sha512`, `hmacSHA256`, `aesGcmEncrypt`/`aesGcmDecrypt`, `pbkdf2Derive`, `ed25519Sign`/`ed25519Verify`, `secureRandomBytes`, `randomToken`.
- **IDs:** `uuidV4`, `uuidV7`, `ulid`, `snowflakeId`, `nanoId` (plus bulk variants).
- **Encoding & serialization:** `b64Encode`/`b64Decode`, `hexEncode`/`hexDecode`, `jwtEncode`/`jwtDecode`, `jsonParse`/`jsonStringify`, `yamlParse`/`yamlDump`, `csvParse`/`csvDump`, `xmlToJson`/`jsonToXml`.
- **Text:** `slugify`, `escapeHtml`, `truncate`, `markdownToHtml`, `renderTemplate`, `levenshteinDistance`, `fuzzyMatch`.
- **Validation:** `validateEmail`, `validateUrl`, `validateUuid`, `validateIp`, `luhnCheck`, `validateIban`, `sanitizeHtml`.
- **Compression:** `gzipCompress`/`gzipDecompress`, `brotliCompress`/`brotliDecompress`.
- **Datetime:** `nowIso`, `parseIso8601`, `formatHttpDate`, `convertTimezone`, `cronValidate`.
- **Data structures:** `BloomFilter`, `HyperLogLog`, `PriorityQueue`, `SortedSet`, `RingBuffer`.
- **Middleware utilities:** `RateLimiter`, `etagStrong`/`etagWeak`, `webhookSign`/`webhookVerify`, `negotiateContentType`, `negotiateLanguage`, `ipInCidr`.

See `src/index.ts` for the full export surface.

---

## Testing

Rivex ships an in-process `TestClient` that dispatches requests straight to your route handlers — applying middleware and exception handlers exactly like the production server — without binding a port.

```ts
import { describe, it, expect } from 'vitest';
import { Rivex, TestClient } from 'rivex';

describe('hello', () => {
  it('returns json', async () => {
    const app = new Rivex();
    app.get('/hello', async () => ({ message: 'hi' }));

    const client = new TestClient(app);
    const resp = await client.get('/hello');

    expect(resp.statusCode).toBe(200);
    expect(resp.json()).toEqual({ message: 'hi' });
  });

  it('echoes a posted body', async () => {
    const app = new Rivex();
    app.post('/echo', async (ctx) => ctx.request.json());

    const client = new TestClient(app);
    const resp = await client.post('/echo', { json: { name: 'test' } });

    expect(resp.json()).toEqual({ name: 'test' });
  });
});
```

`TestClient` exposes `get`/`post`/`put`/`delete`/`patch`/`head` and a generic `request(method, url, options)`. `RequestOptions` accepts `headers`, `params` (query), `json`, `data` (form), and `body`. Responses (`TestResponse`) provide `statusCode`, `headers`, `body`, `json<T>()`, and `text()`.

This repository's own test suite (Vitest) runs with:

```bash
npm test          # watch mode
npm run test:run  # single run (CI)
```

Run a single file:

```bash
npx vitest run tests/router.test.ts
```

---

## Building from source / development

```bash
# Install dependencies
npm install

# Type-check without emitting
npm run typecheck

# Lint
npm run lint

# Run the test suite once
npm run test:run

# Build the distributable (tsc -> dist/)
npm run build

# Remove build output
npm run clean
```

The full check suite used in CI is `npm run typecheck && npm run lint && npm run test:run && npm run build`.

| Script | Command |
| --- | --- |
| `build` | `tsc -p tsconfig.build.json` |
| `test` | `vitest` |
| `test:run` | `vitest run` |
| `lint` | `eslint src/` |
| `typecheck` | `tsc --noEmit` |
| `clean` | `rm -rf dist` |

Examples live in `examples/` and run directly with `tsx`:

```bash
npx tsx examples/hello.ts
npx tsx examples/todo-api.ts
npx tsx examples/testing-demo.ts
```

---

## The Rivex ecosystem

Every Rivex SDK is a thin, idiomatic binding over the same **Rust core (`rivex-core`)**, so routing, validation, and raw performance stay consistent across languages.

| Component | Package / module | Language |
| --- | --- | --- |
| Core runtime | `rivex-core` | Rust |
| Python SDK | `rivex` | Python ≥ 3.10 |
| TypeScript / JavaScript SDK | `rivex` | TypeScript / Node |
| Go SDK | `github.com/rivex-dev/rivex-go` | Go |
| Ruby SDK | `rivex` | Ruby |
| CLI | `rivex-cli` | Python |

The Python and TypeScript SDKs deliberately share naming and concepts — `Depends()`, `HTTPException`, `Router`/`APIRouter`, and a `FastAPI` alias for `Rivex` — so moving between them takes minimal context-switching.

---

## Contributing

Contributions are welcome. The workflow:

1. Branch from `main`.
2. Add tests for your change (Vitest; tests must not require a running server — use `TestClient`).
3. Run `npm run typecheck`, `npm run lint`, and `npm run test:run`.
4. Open a pull request targeting `main`.

Commit messages follow Conventional Commits (e.g. `feat(controller): add @Options decorator`). See [CONTRIBUTING.md](CONTRIBUTING.md) for repository layout, code style, and versioning details.

---

## License

MIT — see [LICENSE](LICENSE).
