/**
 * Writes `apps/api/openapi.json` from the Hono OpenAPI registry.
 *
 * Scaffold stub — route registration lands with the billing `/v1` milestone.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createApp } from "./app.ts";
import { getContainer } from "./server/container.ts";

const app = createApp(getContainer());
const document = app.getOpenAPI31Document({
  openapi: "3.1.0",
  info: {
    title: "Repo Public API",
    version: "1.0.0",
  },
});

const outPath = resolve(import.meta.dirname, "../openapi.json");
writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
