import type { RouteRecord } from './types.js';
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
    tags?: Array<{
        name: string;
        description?: string;
    }>;
    servers?: Array<{
        url: string;
        description?: string;
    }>;
    components?: Record<string, unknown>;
}
export interface GenerateOpenAPIOptions {
    title: string;
    version: string;
    description?: string;
    routes: RouteRecord[];
    openApiTags?: Array<{
        name: string;
        description?: string;
    }>;
    servers?: Array<{
        url: string;
        description?: string;
    }>;
    termsOfService?: string;
    contact?: Record<string, unknown>;
    licenseInfo?: Record<string, unknown>;
}
/**
 * Generate an OpenAPI 3.1.0 specification from the registered routes
 * and application metadata.
 */
export declare function generateOpenAPI(options: GenerateOpenAPIOptions): OpenAPISpec;
export declare function generateSwaggerHTML(title: string, openApiUrl: string): string;
//# sourceMappingURL=openapi.d.ts.map