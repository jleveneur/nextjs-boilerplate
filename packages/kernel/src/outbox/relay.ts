/**
 * Transactional outbox relay: claim pending rows → run handlers → mark published.
 *
 * Handlers are supplied by the composition root, not resolved here. That keeps
 * the relay from importing any feature: a mapping table living in this file
 * would have to name `../billing` and `../assets`, which is an upward
 * dependency from shared code into the slices that depend on it.
 *
 * An event type with no registered handler is skipped and marked published
 * rather than retried forever — the row has been seen and nothing wants it.
 */

import {
  claimPendingOutboxEvents,
  markOutboxFailed,
  markOutboxPublished,
  withTransaction,
  type Database,
} from "@repo/db";
import type { OutboxId } from "@repo/types";

export type OutboxEventHandler = (input: {
  payload: unknown;
  /** Stable per-row id. Use as the idempotency key for anything downstream. */
  outboxId: OutboxId;
}) => Promise<void>;

/** Keyed by domain event type, e.g. `invoice.voided`. */
export type OutboxHandlers = Readonly<Record<string, OutboxEventHandler>>;

export type RelayOutboxBatchResult = {
  claimed: number;
  published: number;
  failed: number;
  skipped: number;
};

export type RelayOutboxBatchOptions = {
  db: Database;
  handlers: OutboxHandlers;
  limit?: number;
  now?: Date;
  /** Backoff after a failed handler run. Defaults to 30s. */
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
        const handler = options.handlers[row.eventType];
        if (handler === undefined) {
          skipped += 1;
          await markOutboxPublished(tx, id, now);
          continue;
        }

        await handler({ payload: row.payload, outboxId: id });
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
