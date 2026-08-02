import { ApiReference } from "@scalar/nextjs-api-reference";

/**
 * Scalar HTML document for the committed OpenAPI snapshot
 * (`public/openapi.json`, synced from `apps/api/openapi.json`).
 */
export const GET = ApiReference({
  url: "/openapi.json",
  theme: "default",
  pageTitle: "API reference",
});
