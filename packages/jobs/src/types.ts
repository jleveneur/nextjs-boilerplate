import type { JobName, JobPayload } from "./registry.ts";

export type EnqueueOptions = {
  /** Delay before the job becomes active. */
  delayMs?: number;
  /** Max attempts including the first run. Defaults to adapter policy. */
  attempts?: number;
  /**
   * Stable id for deduplication. Prefer the payload's idempotency key when
   * the backend supports job ids.
   */
  jobId?: string;
};

export type EnqueueResult = {
  id: string;
};

/**
 * JobQueue port. Core re-exports this surface — never BullMQ queue types.
 */
export type JobQueue = {
  enqueue<N extends JobName>(
    name: N,
    payload: JobPayload<N>,
    opts?: EnqueueOptions,
  ): Promise<EnqueueResult>;
  close(): Promise<void>;
};

export type CreateBullMqJobQueueOptions = {
  redisUrl: string;
  /** BullMQ queue name. Defaults to `default`. */
  queueName?: string;
  /** Key prefix so multiple apps can share one Redis. */
  prefix?: string;
};

export type JobHandler<N extends JobName = JobName> = (
  payload: JobPayload<N>,
  meta: { jobId: string; attemptsMade: number },
) => Promise<void>;

export type JobHandlers = {
  [N in JobName]: JobHandler<N>;
};

export type DeadLetterRecord = {
  queueName: string;
  dlqName: string;
  jobName: string;
  jobId: string;
  attemptsMade: number;
  failedReason: string;
  payload: unknown;
};

export type DeadLetterErrorContext = {
  record: DeadLetterRecord;
  stage: "enqueue" | "notify";
  error: unknown;
};

export type CreateBullMqWorkerOptions = {
  redisUrl: string;
  handlers: JobHandlers;
  queueName?: string;
  prefix?: string;
  concurrency?: number;
  /** Per-job lock duration (ms). Defaults to BullMQ's 30s. */
  lockDurationMs?: number;
  /** Max attempts including the first run. Defaults to 5. */
  attempts?: number;
  /**
   * Called when a job is moved to the dead-letter queue (exhausted retries or
   * terminal error). Composition roots log / alert from here.
   */
  onDeadLetter?: (record: DeadLetterRecord) => void | Promise<void>;
  /**
   * Called when adding a job to the dead-letter queue or notifying
   * `onDeadLetter` fails. If omitted, the failure is emitted by the worker.
   */
  onDeadLetterError?: (context: DeadLetterErrorContext) => void | Promise<void>;
};
