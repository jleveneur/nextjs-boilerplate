/**
 * BullMQ {@link JobQueue} adapter.
 *
 * Takes a Redis URL directly — does not import `@repo/cache` (same-layer ban).
 */

import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { parseJobPayload } from "./registry.ts";
import type { JobName, JobPayload } from "./registry.ts";
import { wrapJobData } from "./trace-envelope.ts";
import type {
  CreateBullMqJobQueueOptions,
  EnqueueOptions,
  EnqueueResult,
  JobQueue,
} from "./types.ts";

const DEFAULT_QUEUE = "default";
const DEFAULT_ATTEMPTS = 5;

export type BullMqJobQueue = JobQueue & {
  readonly queueName: string;
};

export function createBullMqJobQueue(options: CreateBullMqJobQueueOptions): BullMqJobQueue {
  const queueName = options.queueName ?? DEFAULT_QUEUE;
  const connection = new Redis(options.redisUrl, {
    maxRetriesPerRequest: null,
  });

  const queue = new Queue(queueName, {
    connection,
    ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
    defaultJobOptions: {
      attempts: DEFAULT_ATTEMPTS,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  return {
    queueName,
    async enqueue<N extends JobName>(
      name: N,
      payload: JobPayload<N>,
      opts?: EnqueueOptions,
    ): Promise<EnqueueResult> {
      const validated = parseJobPayload(name, payload);
      const job = await queue.add(name, wrapJobData(validated), {
        ...(opts?.delayMs === undefined ? {} : { delay: opts.delayMs }),
        ...(opts?.attempts === undefined ? {} : { attempts: opts.attempts }),
        ...(opts?.jobId === undefined ? {} : { jobId: opts.jobId }),
      });

      if (job.id === undefined) {
        throw new Error(`BullMQ accepted job "${name}" without an id`);
      }

      return { id: job.id };
    },
    async close() {
      await queue.close();
      await connection.quit();
    },
  };
}
