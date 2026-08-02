/**
 * API process entry.
 *
 * Observability MUST be the first import so OTel auto-instrumentation patches
 * HTTP / pg / ioredis before those modules load.
 */
import { observability } from "./observability.ts";

import { serve } from "@hono/node-server";

import { createApp } from "./app.ts";
import { env } from "./env.ts";
import { getContainer } from "./server/container.ts";

const container = getContainer();
const app = createApp(container);
const port = env.API_PORT;

const server = serve({ fetch: app.fetch, port }, () => {
  container.logger.info({ port }, "api listening");
});

async function shutdown(signal: string): Promise<void> {
  container.logger.info({ signal }, "api shutting down");
  server.close();
  await container.ports.jobs.close();
  await container.cache.close();
  await container.sql.end({ timeout: 5 });
  await container.closeAnalytics();
  await observability.shutdown();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
