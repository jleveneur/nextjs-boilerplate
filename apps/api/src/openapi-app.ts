/**
 * OpenAPI document app — no `@repo/core` / `server-only` imports.
 */

import { OpenAPIHono } from "@hono/zod-openapi";

import { invoiceOpenApiRoutes } from "./routes/v1/invoice-routes.ts";

const openApiInfo = {
  openapi: "3.1.0" as const,
  info: {
    title: "Repo Public API",
    version: "1.0.0",
  },
};

export function createOpenApiDocumentApp(): OpenAPIHono {
  const app = new OpenAPIHono();
  const v1 = new OpenAPIHono();
  for (const route of invoiceOpenApiRoutes) {
    // Handlers are never invoked during document generation.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- docs stub
    v1.openapi(route, (c) => c.json({} as never, 200));
  }
  app.route("/v1", v1);
  app.doc31("/openapi.json", openApiInfo);
  return app;
}
