/**
 * Short-lived / long-running BullMQ worker bound to the job registry.
 *
 * Exhausted attempts and terminal errors are moved to `${queueName}-dlq`.
 */

import { Queue, UnrecoverableError, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";

import { isJobName, parseJobPayload } from "./registry.ts";
import type { CreateBullMqWorkerOptions, DeadLetterRecord } from "./types.ts";

const DEFAULT_QUEUE = "default";
const DEFAULT_ATTEMPTS = 5;

export type BullMqWorker = {
  readonly queueName: string;
  readonly dlqName: string;
  close(): Promise<void>;
  /** Resolves when the worker is ready to process jobs. */
  waitUntilReady(): Promise<void>;
};

export function createBullMqWorker(options: CreateBullMqWorkerOptions): BullMqWorker {
  const queueName = options.queueName ?? DEFAULT_QUEUE;
  const dlqName = `${queueName}-dlq`;
  const maxAttempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const connection = new Redis(options.redisUrl, {
    maxRetriesPerRequest: null,
  });

  const dlq = new Queue(dlqName, {
    connection,
    ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
  });

  async function moveToDeadLetter(job: Job, failedReason: string): Promise<void> {
    await dlq.add(job.name, job.data, {
      jobId: `dlq-${job.id ?? job.name}-${String(job.attemptsMade)}`,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    });

    const record: DeadLetterRecord = {
      queueName,
      dlqName,
      jobName: job.name,
      jobId: job.id ?? job.name,
      attemptsMade: job.attemptsMade,
      failedReason,
      payload: job.data,
    };

    await options.onDeadLetter?.(record);
  }

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      if (!isJobName(job.name)) {
        throw new UnrecoverableError(`Unknown job name: ${job.name}`);
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
        case "image.derive": {
          const payload = parseJobPayload(job.name, job.data);
          await options.handlers[job.name](payload, meta);
          return;
        }
        case "asset.reconcile-orphans": {
          const payload = parseJobPayload(job.name, job.data);
          await options.handlers[job.name](payload, meta);
          return;
        }
      }
    },
    {
      connection,
      concurrency: options.concurrency ?? 1,
      ...(options.lockDurationMs === undefined ? {} : { lockDuration: options.lockDurationMs }),
      ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
    },
  );

  worker.on("failed", (job, error) => {
    if (job === undefined) {
      return;
    }

    const terminal = error instanceof UnrecoverableError;
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? maxAttempts);
    if (!terminal && !exhausted) {
      return;
    }

    void moveToDeadLetter(job, error.message).catch(() => {
      // DLQ move failures are logged by the composition root if onDeadLetter throws.
    });
  });

  return {
    queueName,
    dlqName,
    waitUntilReady() {
      return worker.waitUntilReady().then(() => undefined);
    },
    async close() {
      await worker.close();
      await dlq.close();
      await connection.quit();
    },
  };
}
