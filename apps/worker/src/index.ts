import { serve } from "@hono/node-server";

import { createApp } from "./app.ts";
import { buildContainer } from "./container.ts";
import { env } from "./env.ts";
import { startOutboxRelay } from "./outbox-relay.ts";
import { assertRedisNoEviction } from "./redis-policy.ts";
import { startSchedules } from "./schedules.ts";

await assertRedisNoEviction(env.REDIS_URL);

const container = buildContainer();
const app = createApp(container);
const port = env.WORKER_PORT;

const server = serve({ fetch: app.fetch, port }, () => {
  container.logger.info({ port }, "worker health listening");
});

await container.worker.waitUntilReady();
container.logger.info({ queue: container.worker.queueName }, "bullmq worker ready");

const relay = startOutboxRelay(container, env.OUTBOX_POLL_MS, container.logger);
const schedules = await startSchedules(env.REDIS_URL, container.logger);

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  container.logger.info({ signal }, "worker shutting down");

  relay.stop();
  server.close();
  await container.worker.close();
  await schedules.close();
  await container.jobs.close();
  await container.idempotencyRedis.quit();
  await container.sql.end({ timeout: 5 });
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
