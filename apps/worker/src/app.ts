import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { Redis } from "ioredis";

import type { AppContainer } from "./container.ts";
import { env } from "./env.ts";

/**
 * Internal health surface only — no public business routes.
 */
export function createApp(container: AppContainer): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/health/ready", async (c) => {
    const redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    try {
      await container.db.execute(sql`select 1`);
      await redis.connect();
      await redis.ping();
      return c.json({ status: "ready" });
    } catch {
      return c.json({ status: "not_ready" }, 503);
    } finally {
      redis.disconnect();
    }
  });

  return app;
}
