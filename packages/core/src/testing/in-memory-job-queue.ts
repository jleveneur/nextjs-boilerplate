import type { JobName, JobPayload } from "@repo/jobs";

import type { EnqueueOptions, EnqueueResult, JobQueue } from "../ports/job-queue.ts";

export type EnqueuedJob = {
  name: JobName;
  payload: unknown;
  opts?: EnqueueOptions;
};

export type InMemoryJobQueue = JobQueue & {
  readonly jobs: readonly EnqueuedJob[];
  clear(): void;
};

export function createInMemoryJobQueue(): InMemoryJobQueue {
  const jobs: EnqueuedJob[] = [];
  let seq = 0;

  return {
    get jobs() {
      return jobs;
    },
    clear() {
      jobs.length = 0;
    },
    enqueue<N extends JobName>(
      name: N,
      payload: JobPayload<N>,
      opts?: EnqueueOptions,
    ): Promise<EnqueueResult> {
      seq += 1;
      const entry: EnqueuedJob = {
        name,
        payload,
        ...(opts === undefined ? {} : { opts }),
      };
      jobs.push(entry);
      return Promise.resolve({ id: opts?.jobId ?? `mem-job-${seq}` });
    },
    close(): Promise<void> {
      return Promise.resolve();
    },
  };
}
