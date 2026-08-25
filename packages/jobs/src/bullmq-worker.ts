/**
 * Short-lived / long-running BullMQ worker bound to the job registry.
 *
 * Exhausted attempts and terminal errors are moved to `${queueName}-dlq`.
 * Trace context is restored from the job envelope before the handler runs.
 */

import { Queue, UnrecoverableError, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";

import { moveToDeadLetter } from "./dead-letter.ts";
import { createBullMqMetrics } from "./metrics.ts";
import { isJobName, parseJobPayload } from "./registry.ts";
import { unwrapJobData, withJobTraceContext } from "./trace-envelope.ts";
import type { CreateBullMqWorkerOptions, DeadLetterRecord } from "./types.ts";

const DEFAULT_QUEUE = "default";
const DEFAULT_ATTEMPTS = 5;

function normalizeError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Failed to process dead-letter job", { cause: error });
}

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

  const waitingQueue = new Queue(queueName, {
    connection,
    ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
  });
  const metricsHandle = createBullMqMetrics(waitingQueue);

  const dlq = new Queue(dlqName, {
    connection,
    ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
  });

  async function deadLetterJob(job: Job, failedReason: string): Promise<void> {
    const { payload } = unwrapJobData(job.data);
    const record: DeadLetterRecord = {
      queueName,
      dlqName,
      jobName: job.name,
      jobId: job.id ?? job.name,
      attemptsMade: job.attemptsMade,
      failedReason,
      payload,
    };

    await moveToDeadLetter({
      record,
      enqueue: async () => {
        await dlq.add(job.name, job.data, {
          jobId: `dlq-${job.id ?? job.name}-${String(job.attemptsMade)}`,
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        });
      },
      ...(options.onDeadLetter === undefined ? {} : { onDeadLetter: options.onDeadLetter }),
      ...(options.onDeadLetterError === undefined
        ? {}
        : { onDeadLetterError: options.onDeadLetterError }),
    });
  }

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      if (!isJobName(job.name)) {
        throw new UnrecoverableError(`Unknown job name: ${job.name}`);
      }

      const { payload: rawPayload, trace } = unwrapJobData(job.data);
      const meta = {
        jobId: job.id ?? job.name,
        attemptsMade: job.attemptsMade,
      };
      const started = performance.now();

      try {
        await withJobTraceContext(job.name, trace, async () => {
          // Exhaustive switch keeps payload/handler pairing sound as jobs are added.
          switch (job.name) {
            case "email.send": {
              const payload = parseJobPayload(job.name, rawPayload);
              await options.handlers[job.name](payload, meta);
              return;
            }
            case "invoice.voided.notify": {
              const payload = parseJobPayload(job.name, rawPayload);
              await options.handlers[job.name](payload, meta);
              return;
            }
            case "image.derive": {
              const payload = parseJobPayload(job.name, rawPayload);
              await options.handlers[job.name](payload, meta);
              return;
            }
            case "asset.reconcile-orphans": {
              const payload = parseJobPayload(job.name, rawPayload);
              await options.handlers[job.name](payload, meta);
              return;
            }
          }
        });
      } finally {
        metricsHandle.recordDuration(queueName, job.name, (performance.now() - started) / 1000);
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

    metricsHandle.recordFailure(queueName, job.name);

    // BullMQ event listeners return void, so route all asynchronous failures to
    // the worker's error event instead of leaving a rejected promise unobserved.
    void deadLetterJob(job, error.message).catch((deadLetterError: unknown) => {
      worker.emit("error", normalizeError(deadLetterError));
    });
  });

  return {
    queueName,
    dlqName,
    waitUntilReady() {
      return worker.waitUntilReady().then(() => undefined);
    },
    async close() {
      metricsHandle.dispose();
      await worker.close();
      await waitingQueue.close();
      await dlq.close();
      await connection.quit();
    },
  };
}
