# Contributing to Rivex JS/TS SDK

Thank you for your interest in contributing to Rivex! This guide covers
the TypeScript/JavaScript SDK -- the user-facing framework layer built on
the Rust runtime.

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Rust** toolchain (needed to build `rivex-native` when available)

## Repository Layout

```
src/
  index.ts              Public API exports
  application.ts        Rivex app class
  router.ts             Router class
  controller.ts         Controller base class + decorators
  request.ts            Request and Headers classes
  response.ts           Response classes (JSON, HTML, Redirect, Streaming)
  middleware.ts          CORS, GZip, RequestId, TrustedHost
  depends.ts            Dependency injection (Depends, Dependency)
  security.ts           APIKeyHeader, HTTPBearer, OAuth2PasswordBearer
  exceptions.ts         HTTPException
  background.ts         BackgroundTask, BackgroundTasks
  uploads.ts            UploadFile, File, Form, multipart parsing
  status.ts             HTTP status code constants
  openapi.ts            OpenAPI 3.1 spec generation
  testing.ts            TestClient and TestResponse
  types.ts              Shared type definitions
  native/
    bindings.ts          NAPI-RS binding placeholder
tests/
  application.test.ts   App initialisation and routing
  router.test.ts        Router and controller tests
  middleware.test.ts     Middleware tests
  testing.test.ts       TestClient, security, uploads, OpenAPI tests
examples/
  hello.ts              Basic hello world
  todo-api.ts           CRUD API example
  request-features.ts   Middleware, security, decorators
```

## Getting Started

```bash
# Clone the repository
git clone https://github.com/rivex-dev/js.rivex.dev.git
cd js.rivex.dev

# Install dependencies
npm install

# Run tests
npm test

# Type-check without emitting
npm run typecheck

# Build
npm run build
```

## Development Workflow

1. **Create a branch** from `main`
2. **Write tests** for your changes
3. **Run the full check suite**:
   ```bash
   npm run typecheck
   npm run lint
   npm run test:run
   ```
4. **Open a pull request** targeting `main`

## Writing Tests

- Tests live in `tests/*.test.ts`
- Use [Vitest](https://vitest.dev/) conventions (`describe`, `it`, `expect`)
- Tests should NOT require a running server -- use `TestClient`
- Run a single file: `npx vitest run tests/router.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { Rivex } from '../src/application.js';
import { TestClient } from '../src/testing.js';

describe('my feature', () => {
  it('should work', async () => {
    const app = new Rivex();
    app.get('/test', async () => ({ ok: true }));

    const client = new TestClient(app);
    const resp = await client.get('/test');
    expect(resp.statusCode).toBe(200);
  });
});
```

## Commit Messages

```
fix(middleware): strip Content-Length after gzip compression
feat(controller): add @Head and @Options decorators
test(openapi): add tests for nested router tag merging
```

## Versioning

This project uses [Semantic Versioning](https://semver.org/).
Version is set in `package.json`. When bumping, update `package.json`,
`src/index.ts` (VERSION export), and `CHANGELOG.md`.

## Code Style

- TypeScript strict mode (`strict: true`)
- ESM modules (`"type": "module"` in package.json)
- Type hints on all public function signatures
- JSDoc comments on public classes and functions
- `async/await` by default for handlers and middleware

## CI

GitHub Actions runs on every push and PR:

| Check | Command |
|-------|---------|
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Test | `npm run test:run` |
| Build | `npm run build` |

All checks must pass before merging.
