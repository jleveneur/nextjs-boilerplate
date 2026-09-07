/**
 * Transactional outbox relay: lease due rows → run handlers → settle each row.
 *
 * Handlers are supplied by the composition root, not resolved here. That keeps
 * the relay from importing any feature: a mapping table living in this file
 * would have to name `../billing` and `../assets`, which is an upward
 * dependency from shared code into the slices that depend on it.
 *
 * Three phases, deliberately, because handlers do network I/O:
 *
 * 1. **Lease** in one short transaction. `available_at` moves past the lease
 *    window, so the claim survives the commit and other drainers skip the row.
 * 2. **Run handlers outside any transaction.** Sending mail or deriving an
 *    image inside one would hold a pooled connection and a row lock for the
 *    duration, and Postgres would kill the transaction on
 *    `idle_in_transaction_session_timeout` part-way through a handler.
 * 3. **Settle** each row in its own short transaction.
 *
 * An event type with no registered handler is settled as published rather than
 * retried forever — the row has been seen and nothing wants it.
 *
 * Delivery is at-least-once. A handler that throws *after* its side effect
 * landed will run again, so handlers must guard their own side effects.
 */

import {
  leaseDueOutboxEvents,
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
  /**
   * How long a leased row stays invisible to other drainers. Defaults to 5
   * minutes — long enough for a slow mail server, short enough that a crashed
   * process does not strand the row for an hour.
   */
  leaseMs?: number;
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
  const leaseMs = options.leaseMs ?? 300_000;

  const rows = await withTransaction(options.db, async (tx) =>
    leaseDueOutboxEvents(tx, { limit, leaseMs, now }),
  );

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const id = brandOutboxId(row.id);
    const handler = options.handlers[row.eventType];

    if (handler === undefined) {
      skipped += 1;
      await withTransaction(options.db, async (tx) => markOutboxPublished(tx, id, now));
      continue;
    }

    try {
      // Sequential on purpose: handlers share the process, and running a batch
      // of image derivations concurrently would starve the event loop of the
      // request that triggered the drain.
      // oxlint-disable-next-line eslint/no-await-in-loop
      await handler({ payload: row.payload, outboxId: id });
      published += 1;
      // oxlint-disable-next-line eslint/no-await-in-loop
      await withTransaction(options.db, async (tx) => markOutboxPublished(tx, id, now));
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "unknown relay error";
      // oxlint-disable-next-line eslint/no-await-in-loop
      await withTransaction(options.db, async (tx) =>
        markOutboxFailed(tx, id, message, new Date(now.getTime() + retryDelayMs)),
      );
    }
  }

  return { claimed: rows.length, published, failed, skipped };
}
