/**
 * Outbox claim / publish helpers for the relay.
 */

import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";

import type { OutboxId } from "@repo/types";

import { outbox, type OutboxStatus } from "../schema/outbox.sql.ts";
import type { DbExecutor } from "../with-transaction.ts";

export type OutboxClaimRow = typeof outbox.$inferSelect;

/**
 * Lease up to `limit` due rows: push `available_at` past the lease window so no
 * other drainer sees them, and hand the rows back.
 *
 * A lease rather than a row lock, because the handler that runs next does
 * network I/O — sending mail, reading and writing S3, running Sharp. Holding
 * `for update skip locked` across that would keep a pooled connection and a row
 * lock open for the duration, and Postgres would kill the transaction on
 * `idle_in_transaction_session_timeout` mid-handler. The lease survives the
 * commit, so the claim outlives the transaction that made it.
 *
 * `attempts` increments here rather than on failure, so a row whose handler
 * hangs or whose process dies still counts against it — otherwise a poison row
 * that never reaches a failure path could be leased forever.
 *
 * A crashed drainer needs no cleanup: its rows become due again when the lease
 * expires.
 */
export async function leaseDueOutboxEvents(
  db: DbExecutor,
  options: { limit: number; leaseMs: number; now?: Date },
): Promise<OutboxClaimRow[]> {
  const now = options.now ?? new Date();
  const leaseUntil = new Date(now.getTime() + options.leaseMs);

  const due = db
    .select({ id: outbox.id })
    .from(outbox)
    .where(and(eq(outbox.status, "pending"), lte(outbox.availableAt, now)))
    .orderBy(asc(outbox.availableAt))
    .limit(options.limit)
    .for("update", { skipLocked: true });

  return db
    .update(outbox)
    .set({
      availableAt: leaseUntil,
      attempts: sql`${outbox.attempts} + 1`,
      updatedAt: sql`now()`,
    })
    .where(inArray(outbox.id, due))
    .returning();
}

/**
 * Claim up to `limit` pending rows that are due, locking them for this transaction.
 *
 * Only safe when everything that follows is fast and in-process; the lock lasts
 * exactly as long as the surrounding transaction. Prefer
 * {@link leaseDueOutboxEvents} for anything that does I/O.
 */
export async function claimPendingOutboxEvents(
  db: DbExecutor,
  limit: number,
  now: Date = new Date(),
): Promise<OutboxClaimRow[]> {
  return db
    .select()
    .from(outbox)
    .where(and(eq(outbox.status, "pending"), lte(outbox.availableAt, now)))
    .orderBy(asc(outbox.availableAt))
    .limit(limit)
    .for("update", { skipLocked: true });
}

export async function markOutboxPublished(
  db: DbExecutor,
  id: OutboxId,
  publishedAt: Date = new Date(),
): Promise<void> {
  await db
    .update(outbox)
    .set({
      status: "published" satisfies OutboxStatus,
      publishedAt,
      updatedAt: sql`now()`,
    })
    .where(eq(outbox.id, id));
}

export async function markOutboxFailed(
  db: DbExecutor,
  id: OutboxId,
  lastError: string,
  retryAt: Date,
): Promise<void> {
  await db
    .update(outbox)
    .set({
      // `attempts` is incremented by the lease, not here: a handler that never
      // returns must still count, and double-counting a returned failure would
      // make the number mean two different things.
      lastError: lastError.slice(0, 2000),
      availableAt: retryAt,
      updatedAt: sql`now()`,
    })
    .where(eq(outbox.id, id));
}
