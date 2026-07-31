/**
 * Writes `apps/api/openapi.json` from the Hono OpenAPI registry.
 *
 * Does not open DB/Redis or import `@repo/core`.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createOpenApiDocumentApp } from "./openapi-app.ts";

const app = createOpenApiDocumentApp();
const document = app.getOpenAPI31Document({
  openapi: "3.1.0",
  info: {
    title: "Repo Public API",
    version: "1.0.0",
  },
});

const outPath = resolve(import.meta.dirname, "../openapi.json");
writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
