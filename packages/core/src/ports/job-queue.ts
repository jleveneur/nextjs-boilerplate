/**
 * Job enqueue port — re-exported from `@repo/jobs` so adapters stay injectable
 * and core never imports BullMQ.
 */

export type { EnqueueOptions, EnqueueResult, JobQueue } from "@repo/jobs";
