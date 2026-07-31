import { OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";

import type { AppContainer } from "./server/container.ts";

export type ApiEnv = {
  Variables: {
    container: AppContainer;
    requestId: string;
  };
};

/** Build the Hono app. Middleware and `/v1` routes mount in later milestones. */
export function createApp(container: AppContainer): OpenAPIHono<ApiEnv> {
  const app = new OpenAPIHono<ApiEnv>();

  app.use("*", async (c, next) => {
    c.set("container", container);
    await next();
  });

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/health/ready", async (c) => {
    try {
      await c.get("container").db.execute(sql`select 1`);
      return c.json({ status: "ready" });
    } catch {
      return c.json({ status: "not_ready" }, 503);
    }
  });

  return app;
}
