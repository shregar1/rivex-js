import type { RouteRecord } from './types.js';

// ── Public types ──

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: Record<string, unknown>;
    license?: Record<string, unknown>;
  };
  paths: Record<string, Record<string, unknown>>;
  tags?: Array<{ name: string; description?: string }>;
  servers?: Array<{ url: string; description?: string }>;
  components?: Record<string, unknown>;
}

export interface GenerateOpenAPIOptions {
  title: string;
  version: string;
  description?: string;
  routes: RouteRecord[];
  openApiTags?: Array<{ name: string; description?: string }>;
  servers?: Array<{ url: string; description?: string }>;
  termsOfService?: string;
  contact?: Record<string, unknown>;
  licenseInfo?: Record<string, unknown>;
}

// ── Generator ──

/**
 * Generate an OpenAPI 3.1.0 specification from the registered routes
 * and application metadata.
 */
export function generateOpenAPI(options: GenerateOpenAPIOptions): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.1.0',
    info: {
      title: options.title,
      version: options.version,
    },
    paths: {},
  };

  if (options.description) spec.info.description = options.description;
  if (options.termsOfService) spec.info.termsOfService = options.termsOfService;
  if (options.contact) spec.info.contact = options.contact;
  if (options.licenseInfo) spec.info.license = options.licenseInfo;
  if (options.servers) spec.servers = options.servers;

  const allTags = new Set<string>();

  for (const route of options.routes) {
    if (!route.options.includeInSchema) continue;

    const pathKey = route.path;
    const methodKey = route.method.toLowerCase();

    if (!spec.paths[pathKey]) {
      spec.paths[pathKey] = {};
    }

    const operation = buildOperation(route);
    spec.paths[pathKey][methodKey] = operation;

    for (const tag of route.options.tags) {
      allTags.add(tag);
    }
  }

  if (options.openApiTags) {
    spec.tags = options.openApiTags;
  } else if (allTags.size > 0) {
    spec.tags = Array.from(allTags)
      .sort()
      .map((t) => ({ name: t }));
  }

  return spec;
}

function buildOperation(route: RouteRecord): Record<string, unknown> {
  const op: Record<string, unknown> = {};

  if (route.options.summary) {
    op.summary = route.options.summary;
  }

  if (route.options.description) {
    op.description = route.options.description;
  }

  if (route.options.operationId) {
    op.operationId = route.options.operationId;
  } else {
    // Generate operationId from handler name and path
    const handlerName = route.handler.name || 'anonymous';
    const pathSlug = route.path
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/[{}]/g, '');
    op.operationId = pathSlug ? `${handlerName}_${pathSlug}` : handlerName;
  }

  if (route.options.tags.length > 0) {
    op.tags = [...route.options.tags];
  }

  if (route.options.deprecated) {
    op.deprecated = true;
  }

  // Extract path parameters from the route pattern
  const pathParams = extractPathParams(route.path);
  if (pathParams.length > 0) {
    op.parameters = pathParams.map((name) => ({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
  }

  // Response
  const statusKey = String(route.options.statusCode);
  op.responses = {
    [statusKey]: { description: 'Successful response' },
  };

  if (route.options.openApiExtra) {
    Object.assign(op, route.options.openApiExtra);
  }

  return op;
}

function extractPathParams(path: string): string[] {
  const params: string[] = [];
  for (const segment of path.split('/')) {
    if (segment.startsWith('{') && segment.endsWith('}')) {
      params.push(segment.slice(1, -1));
    }
  }
  return params;
}

// ── Swagger UI HTML ──

export function generateSwaggerHTML(title: string, openApiUrl: string): string {
  return SWAGGER_UI_HTML.replace(/\{title\}/g, title).replace(
    /\{openapi_url\}/g,
    openApiUrl,
  );
}

const SWAGGER_UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>{title} - Docs</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        :root {
            --bg: #fff;
            --fg: #050505;
            --muted: #676767;
            --line: #dedede;
            --soft: #f6f6f6;
            --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
            --sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
            margin: 0;
            background: var(--bg);
            color: var(--fg);
            font-family: var(--sans);
        }
        a { color: inherit; text-decoration: none; }
        .shell { min-height: 100vh; padding: clamp(20px, 3vw, 44px); }
        .topbar {
            display: flex;
            justify-content: space-between;
            gap: 22px;
            border-bottom: 1px solid var(--line);
            padding-bottom: 18px;
        }
        .brand {
            font-family: var(--mono);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .12em;
            text-transform: uppercase;
        }
        .links { display: flex; gap: 16px; color: var(--muted); font-size: 13px; }
        .links a { border-bottom: 1px solid transparent; padding-bottom: 2px; }
        .links a:hover { border-color: var(--fg); color: var(--fg); }
        .hero {
            display: grid;
            grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr);
            gap: clamp(32px, 6vw, 96px);
            border-bottom: 1px solid var(--line);
            padding: clamp(42px, 7vw, 100px) 0;
        }
        h1 {
            margin: 0;
            font-size: clamp(58px, 11vw, 168px);
            line-height: .86;
            text-transform: uppercase;
            overflow-wrap: anywhere;
        }
        .subtitle {
            max-width: 760px;
            margin: 28px 0 0;
            color: var(--muted);
            font-size: clamp(18px, 2vw, 28px);
            line-height: 1.25;
        }
        .layout {
            display: grid;
            grid-template-columns: 280px minmax(0, 1fr);
            gap: clamp(28px, 5vw, 82px);
            padding-top: clamp(34px, 5vw, 72px);
        }
        .endpoint { border-bottom: 1px solid var(--line); padding: 22px 0; }
        .endpoint-header {
            display: grid;
            grid-template-columns: 74px minmax(0, 1fr) auto;
            align-items: center;
            gap: 16px;
        }
        .method {
            font-family: var(--mono);
            border: 1px solid var(--fg);
            background: var(--fg);
            color: var(--bg);
            font-size: 12px;
            font-weight: 800;
            text-align: center;
            padding: 8px 0;
        }
        .path {
            font-family: var(--mono);
            font-size: clamp(18px, 2vw, 28px);
            font-weight: 700;
        }
    </style>
</head>
<body>
    <main class="shell">
        <header class="topbar">
            <div class="brand">RIVEX API DOCS</div>
            <nav class="links">
                <a href="{openapi_url}">OpenAPI JSON</a>
            </nav>
        </header>
        <section class="hero">
            <div>
                <h1>{title}</h1>
                <p class="subtitle" id="description">Loading OpenAPI specification.</p>
            </div>
        </section>
        <div id="endpoint-list"><div>Loading endpoints.</div></div>
    </main>
    <script>
        fetch("{openapi_url}")
            .then(r => r.json())
            .then(spec => {
                document.getElementById("description").textContent =
                    spec.info?.description || "Generated OpenAPI documentation.";
                const endpoints = [];
                Object.entries(spec.paths || {}).forEach(([path, methods]) => {
                    Object.entries(methods).forEach(([method, op]) => {
                        endpoints.push({method: method.toUpperCase(), path, summary: op.summary || ""});
                    });
                });
                document.getElementById("endpoint-list").innerHTML = endpoints.map(e =>
                    '<article class="endpoint"><div class="endpoint-header">' +
                    '<span class="method">' + e.method + '</span>' +
                    '<span class="path">' + e.path + '</span></div>' +
                    (e.summary ? '<p style="margin:14px 0 0 90px;color:var(--muted)">' + e.summary + '</p>' : '') +
                    '</article>'
                ).join("") || "<div>No endpoints.</div>";
            })
            .catch(err => {
                document.getElementById("endpoint-list").innerHTML =
                    "<div>Failed to load spec: " + err.message + "</div>";
            });
    </script>
</body>
</html>`;
