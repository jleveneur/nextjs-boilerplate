/**
 * Insert a pending outbox row inside the caller's transaction.
 *
 * Domain state change and this insert must share one txn (ADR-0007).
 */

import type { DbExecutor } from "@repo/db";
import { outbox } from "@repo/db/schema";
import type { OrganizationId, OutboxId } from "@repo/types";

export type WriteOutboxEventInput = {
  db: DbExecutor;
  id: OutboxId;
  organizationId: OrganizationId | null;
  eventType: string;
  payload: Record<string, unknown>;
  availableAt?: Date;
};

export type OutboxRow = {
  id: OutboxId;
  eventType: string;
};

export async function writeOutboxEvent(input: WriteOutboxEventInput): Promise<OutboxRow> {
  const [row] = await input.db
    .insert(outbox)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      eventType: input.eventType,
      payload: input.payload,
      status: "pending",
      ...(input.availableAt === undefined ? {} : { availableAt: input.availableAt }),
    })
    .returning({ id: outbox.id, eventType: outbox.eventType });

  if (row === undefined) {
    throw new Error("writeOutboxEvent: insert returned no row");
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB uuid branded at boundary
  return { id: row.id as OutboxId, eventType: row.eventType };
}
