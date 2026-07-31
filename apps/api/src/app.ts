import { OpenAPIHono } from "@hono/zod-openapi";
import type { Ctx } from "@repo/core";
import type { Actor } from "@repo/types";
import { sql } from "drizzle-orm";

import {
  apiKeyAuthMiddleware,
  errorHandler,
  idempotencyMiddleware,
  rateLimitMiddleware,
  requestIdMiddleware,
} from "./middleware/index.ts";
import type { AppContainer } from "./server/container.ts";

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
 * Build the Hono app with the public middleware stack and health probes.
 *
 * Authenticated `/v1` routes are mounted here; billing registers in a later
 * milestone. Webhooks mount on the root app (outside Bearer auth).
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
  app.route("/v1", v1);

  return app;
}
