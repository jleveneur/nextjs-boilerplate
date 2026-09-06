import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { sql } from "drizzle-orm";

import type { ApiEnv } from "./api-env.ts";
import { apiKeyAuthMiddleware } from "./middleware/api-key-auth.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { idempotencyMiddleware } from "./middleware/idempotency.ts";
import { rateLimitMiddleware } from "./middleware/rate-limit.ts";
import { requestIdMiddleware } from "./middleware/request-id.ts";
import { securityHeadersMiddleware } from "./middleware/security-headers.ts";
import { registerInvoiceRoutes } from "./routes/v1/invoices.ts";
import type { AppContainer } from "./server/container.ts";
import { registerStripeWebhook } from "./webhooks/stripe.ts";

export type { ApiEnv } from "./api-env.ts";

/**
 * Build the Hono app with the public middleware stack, `/v1` billing routes,
 * and the OpenAPI document endpoint.
 */
export function createApp(container: AppContainer): OpenAPIHono<ApiEnv> {
  const app = new OpenAPIHono<ApiEnv>();

  app.use("*", async (c, next) => {
    c.set("container", container);
    await next();
  });
  app.use("*", securityHeadersMiddleware);
  app.use("*", requestIdMiddleware);
  app.onError(errorHandler);

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/health/ready", async (c) => {
    try {
      await c.get("container").db.execute(sql`select 1`);
      return c.json({ status: "ready" });
    } catch {
      return c.json({ status: "not_ready" }, 503);
    }
  });

  const v1 = new OpenAPIHono<ApiEnv>();
  v1.use("*", apiKeyAuthMiddleware);
  v1.use("*", rateLimitMiddleware);
  v1.use("*", idempotencyMiddleware);
  registerInvoiceRoutes(v1);
  app.route("/v1", v1);

  // Outside Bearer auth — Stripe signs the body instead.
  registerStripeWebhook(app);

  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Repo Public API",
      version: "1.0.0",
    },
  });

  app.get(
    "/reference",
    Scalar({
      url: "/openapi.json",
      pageTitle: "Repo Public API",
    }),
  );

  return app;
}
