# Rivex JS SDK — Examples

Each file is a standalone TypeScript entry point. Run with `tsx`:

```sh
npx tsx examples/hello.ts
```

| Example | What it shows |
| --- | --- |
| `hello.ts` | Minimal app: routing, path params, query params. |
| `todo-api.ts` | CRUD with `Router`, `CORSMiddleware`, `HTTPException`, status codes. |
| `request-features.ts` | Dependency injection, custom middleware, controllers, decorators. |
| `auth-bearer.ts` | `HTTPBearer` security helper guarding protected routes. |
| `background-tasks.ts` | Kicking off work after the response is sent with `BackgroundTasks`. |
| `middleware-chain.ts` | Stacking function + class middleware (logger, counter, request id, CORS). |
| `testing-demo.ts` | Using `TestClient` to exercise an app without starting a server. |

Examples bind to `127.0.0.1:8000` by default. Stop with Ctrl+C.
