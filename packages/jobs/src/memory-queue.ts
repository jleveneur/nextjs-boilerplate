/**
 * In-memory recording {@link JobQueue} for unit tests.
 */

import { parseJobPayload } from "./registry.ts";
import type { EnqueueOptions, EnqueueResult, JobQueue } from "./types.ts";
import type { JobName, JobPayload } from "./registry.ts";

export type RecordedJob = {
  id: string;
  name: JobName;
  payload: JobPayload<JobName>;
  opts?: EnqueueOptions;
};

export type MemoryJobQueue = JobQueue & {
  readonly jobs: readonly RecordedJob[];
  clear(): void;
};

let nextId = 1;

export function createMemoryJobQueue(): MemoryJobQueue {
  const jobs: RecordedJob[] = [];

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
      return Promise.resolve().then(() => {
        const validated = parseJobPayload(name, payload);
        const id = opts?.jobId ?? `memory-${nextId}`;
        nextId += 1;
        jobs.push({
          id,
          name,
          payload: validated,
          ...(opts === undefined ? {} : { opts }),
        });
        return { id };
      });
    },
    close() {
      return Promise.resolve();
    },
  };
}
