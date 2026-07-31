/**
 * Outbox claim / publish helpers for the relay.
 */

import { and, asc, eq, lte, sql } from "drizzle-orm";
import type { OutboxId } from "@repo/types";

import { outbox, type OutboxStatus } from "../schema/outbox.sql.ts";
import type { DbExecutor } from "../with-transaction.ts";

export type OutboxClaimRow = typeof outbox.$inferSelect;

/**
 * Claim up to `limit` pending rows that are due, locking them for this transaction.
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
      attempts: sql`${outbox.attempts} + 1`,
      lastError: lastError.slice(0, 2000),
      availableAt: retryAt,
      updatedAt: sql`now()`,
    })
    .where(eq(outbox.id, id));
}
