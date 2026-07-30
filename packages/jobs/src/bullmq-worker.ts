/**
 * Short-lived / long-running BullMQ worker bound to the job registry.
 */

import { Worker, type Job } from "bullmq";
import { Redis } from "ioredis";

import { isJobName, parseJobPayload } from "./registry.ts";
import type { CreateBullMqWorkerOptions } from "./types.ts";

const DEFAULT_QUEUE = "default";

export type BullMqWorker = {
  readonly queueName: string;
  close(): Promise<void>;
  /** Resolves when the worker is ready to process jobs. */
  waitUntilReady(): Promise<void>;
};

export function createBullMqWorker(options: CreateBullMqWorkerOptions): BullMqWorker {
  const queueName = options.queueName ?? DEFAULT_QUEUE;
  const connection = new Redis(options.redisUrl, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      if (!isJobName(job.name)) {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      const meta = {
        jobId: job.id ?? job.name,
        attemptsMade: job.attemptsMade,
      };

      // Exhaustive switch keeps payload/handler pairing sound as jobs are added.
      switch (job.name) {
        case "email.send": {
          const payload = parseJobPayload(job.name, job.data);
          await options.handlers[job.name](payload, meta);
          return;
        }
        case "invoice.voided.notify": {
          const payload = parseJobPayload(job.name, job.data);
          await options.handlers[job.name](payload, meta);
          return;
        }
      }
    },
    {
      connection,
      concurrency: options.concurrency ?? 1,
      ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
    },
  );

  return {
    queueName,
    waitUntilReady() {
      return worker.waitUntilReady().then(() => undefined);
    },
    async close() {
      await worker.close();
      await connection.quit();
    },
  };
}
