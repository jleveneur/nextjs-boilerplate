/**
 * Transactional outbox relay: claim pending rows → enqueue jobs → mark published.
 *
 * Runs inside the worker process on a short poll interval.
 */

import {
  claimPendingOutboxEvents,
  markOutboxFailed,
  markOutboxPublished,
  withTransaction,
  type Database,
} from "@repo/db";
import type { OutboxId } from "@repo/types";

import type { JobQueue } from "../ports/job-queue.ts";
import { mapOutboxEventToJob } from "./map-event-to-job.ts";

export type RelayOutboxBatchResult = {
  claimed: number;
  published: number;
  failed: number;
  skipped: number;
};

export type RelayOutboxBatchOptions = {
  db: Database;
  jobs: JobQueue;
  limit?: number;
  now?: Date;
  /** Backoff after a failed publish attempt. Defaults to 30s. */
  retryDelayMs?: number;
};

function brandOutboxId(id: string): OutboxId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB uuid branded at boundary
  return id as OutboxId;
}

export async function relayOutboxBatch(
  options: RelayOutboxBatchOptions,
): Promise<RelayOutboxBatchResult> {
  const limit = options.limit ?? 50;
  const now = options.now ?? new Date();
  const retryDelayMs = options.retryDelayMs ?? 30_000;

  return withTransaction(options.db, async (tx) => {
    const rows = await claimPendingOutboxEvents(tx, limit, now);
    let published = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of rows) {
      const id = brandOutboxId(row.id);
      try {
        const mapped = mapOutboxEventToJob(row.eventType, row.payload);
        if (mapped === null) {
          skipped += 1;
          await markOutboxPublished(tx, id, now);
          continue;
        }

        await options.jobs.enqueue(mapped.name, mapped.payload, { jobId: mapped.jobId });
        await markOutboxPublished(tx, id, now);
        published += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "unknown relay error";
        await markOutboxFailed(tx, id, message, new Date(now.getTime() + retryDelayMs));
      }
    }

    return { claimed: rows.length, published, failed, skipped };
  });
}
