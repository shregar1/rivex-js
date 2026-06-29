# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2025-05-12

### Added
- Initial release
- `Rivex` application class with method-based route registration
- `Router` for route grouping with prefix and tag support
- `Controller` base class with `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` decorators
- `Request` class with headers, body parsing, query params, cookies, path params
- `Response` classes: `JSONResponse`, `HTMLResponse`, `PlainTextResponse`, `RedirectResponse`, `StreamingResponse`
- Middleware system with `CORSMiddleware`, `GZipMiddleware`, `RequestIdMiddleware`, `TrustedHostMiddleware`
- Function-based middleware via `app.middleware('http', handler)`
- Dependency injection with `Depends()` and `Dependency` base class
- Security helpers: `APIKeyHeader`, `HTTPBearer`, `OAuth2PasswordBearer`
- `HTTPException` for error responses with status codes and custom headers
- Background task execution with `BackgroundTask` and `BackgroundTasks`
- File upload support with `UploadFile`, `File`, `Form`, and multipart parsing
- HTTP status code constants and `HTTPMethod` / `APIStatus` enums
- OpenAPI 3.1 schema generation from registered routes
- `TestClient` for in-process route testing without a running server
- Lifecycle hooks (`startup` / `shutdown`)
- Custom exception handlers
- NAPI-RS native binding placeholder for Rust core integration

[Unreleased]: https://github.com/rivex-dev/js.rivex.dev/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/rivex-dev/js.rivex.dev/releases/tag/v0.1.0
