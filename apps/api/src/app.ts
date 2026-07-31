import { OpenAPIHono } from "@hono/zod-openapi";
import type { Ctx } from "@repo/core";
import type { Actor } from "@repo/types";
import { apiReference } from "@scalar/hono-api-reference";
import { sql } from "drizzle-orm";

import {
  apiKeyAuthMiddleware,
  errorHandler,
  idempotencyMiddleware,
  rateLimitMiddleware,
  requestIdMiddleware,
} from "./middleware/index.ts";
import { registerInvoiceRoutes } from "./routes/v1/invoices.ts";
import type { AppContainer } from "./server/container.ts";
import { registerStripeWebhook } from "./webhooks/stripe.ts";

export type ApiEnv = {
  Variables: {
    container: AppContainer;
    requestId: string;
    actor: Actor;
    apiKey: string;
    ctx: Ctx;
  };
};

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
    apiReference({
      url: "/openapi.json",
      pageTitle: "Repo Public API",
    }),
  );

  return app;
}
