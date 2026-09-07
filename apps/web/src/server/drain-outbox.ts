// oxlint-disable-next-line import/no-unassigned-import -- composition root, server only
import "server-only";

import { relayOutboxBatch } from "@repo/core";

import { getContainer } from "./container.ts";
import { outboxHandlers } from "./outbox-handlers.ts";

/**
 * Drain pending outbox rows in-process.
 *
 * With no worker there is nothing polling the outbox, so a mutating request
 * drains it after its own transaction has committed. The relay claims rows
 * with `for update skip locked`, so concurrent requests do not double-handle a
 * row and this is safe to call from every replica.
 *
 * Two consequences an adopter should know about:
 *
 * - A row is only picked up when some *later* request arrives. An event
 *   written by the last request of the day is delivered by the first request
 *   of the next one. If that matters, run `relayOutboxBatch` from an external
 *   scheduler as well — the handler registry is the same.
 * - Failures back off by `retryDelayMs` and are retried by whichever request
 *   drains next; nothing escalates them. There is no dead-letter queue.
 *
 * Never throws: a failed drain must not fail the request whose work already
 * committed.
 */
export async function drainOutbox(): Promise<void> {
  const { db, logger } = getContainer();
  try {
    const result = await relayOutboxBatch({ db, handlers: outboxHandlers });
    if (result.failed > 0) {
      logger.warn(result, "outbox drain finished with failures");
    }
  } catch (error) {
    logger.error({ err: error }, "outbox drain failed");
  }
}
