import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createBullMqJobQueue, type BullMqJobQueue } from "./bullmq-queue.ts";
import { createBullMqWorker, type BullMqWorker } from "./bullmq-worker.ts";

function requireRedisUrl(): string {
  const url = process.env["REDIS_URL"];
  if (url === undefined || url === "") {
    throw new Error("REDIS_URL is required for @repo/jobs integration tests");
  }

  return url;
}

describe("createBullMqJobQueue", () => {
  const redisUrl = requireRedisUrl();
  const prefix = `{jobs-it-${Date.now()}}`;
  const queueName = "jobs-integration";

  let queue: BullMqJobQueue;
  let worker: BullMqWorker;
  let processed: { jobId: string; to: string } | undefined;

  beforeAll(async () => {
    queue = createBullMqJobQueue({ redisUrl, queueName, prefix });
    worker = createBullMqWorker({
      redisUrl,
      queueName,
      prefix,
      handlers: {
        "email.send": (payload, meta) => {
          processed = { jobId: meta.jobId, to: payload.to };
          return Promise.resolve();
        },
        "invoice.voided.notify": () => Promise.resolve(),
        "image.derive": () => Promise.resolve(),
        "asset.reconcile-orphans": () => Promise.resolve(),
        "stripe.event.process": () => Promise.resolve(),
      },
    });
    await worker.waitUntilReady();
  });

  afterAll(async () => {
    await worker.close();
    await queue.close();
  });

  it("enqueues a job that a worker processes", async () => {
    const { id } = await queue.enqueue("email.send", {
      to: "integration@example.com",
      subject: "Integration",
      organizationId: "01900000-0000-7000-8000-000000000099",
      idempotencyKey: `it-${Date.now()}`,
    });

    await expect
      .poll(() => processed?.jobId === id, { timeout: 10_000, interval: 50 })
      .toBeTruthy();

    expect(processed?.to).toBe("integration@example.com");
  });
});
