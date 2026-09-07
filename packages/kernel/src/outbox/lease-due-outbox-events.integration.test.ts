import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { leaseDueOutboxEvents } from "@repo/db";
import { outbox } from "@repo/db/schema";
import { setupDbIntegrationTests } from "@repo/db/testing";

import { createSequenceIdGenerator } from "../testing/uuid-id-generator.ts";
import { writeOutboxEvent } from "./write-outbox-event.ts";

/**
 * `leaseDueOutboxEvents` is an `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP
 * LOCKED) RETURNING *`. That shape typechecks and unit-tests fine against a
 * mock while being wrong against Postgres, so it is proven here.
 */
describe("leaseDueOutboxEvents", () => {
  const { withTestTransaction } = setupDbIntegrationTests();

  // One generator per test run: a fresh sequence per call would hand every row
  // the same id and collide on the primary key.
  let ids = createSequenceIdGenerator();

  beforeEach(() => {
    ids = createSequenceIdGenerator();
  });

  async function seed(
    db: Parameters<Parameters<typeof withTestTransaction>[0]>[0]["db"],
    organizationId: string,
    eventType: string,
  ) {
    const id = ids.outboxId();
    await writeOutboxEvent({
      db,
      id,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- factory-made org id
      organizationId: organizationId as never,
      eventType,
      payload: { marker: eventType },
    });
    return id;
  }

  it("returns the leased rows and pushes available_at past the lease window", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      const id = await seed(db, org.id, "invoice.voided");
      const now = new Date();

      const leased = await leaseDueOutboxEvents(db, { limit: 10, leaseMs: 60_000, now });

      expect(leased.map((r) => r.id)).toEqual([id]);
      expect(leased[0]?.payload).toEqual({ marker: "invoice.voided" });
      // The returned row must already carry the lease, not the pre-update value.
      expect(leased[0]?.availableAt.getTime()).toBe(now.getTime() + 60_000);
      expect(leased[0]?.attempts).toBe(1);
    });
  });

  it("hides a leased row from the next lease in the same window", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      await seed(db, org.id, "invoice.voided");
      const now = new Date();

      const first = await leaseDueOutboxEvents(db, { limit: 10, leaseMs: 60_000, now });
      const second = await leaseDueOutboxEvents(db, { limit: 10, leaseMs: 60_000, now });

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
    });
  });

  it("makes the row due again once the lease has expired", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      await seed(db, org.id, "invoice.voided");
      const now = new Date();

      await leaseDueOutboxEvents(db, { limit: 10, leaseMs: 1000, now });
      // This is what recovers a row from a drainer that died mid-handler.
      const afterExpiry = await leaseDueOutboxEvents(db, {
        limit: 10,
        leaseMs: 1000,
        now: new Date(now.getTime() + 2000),
      });

      expect(afterExpiry).toHaveLength(1);
      expect(afterExpiry[0]?.attempts).toBe(2);
    });
  });

  it("respects the limit and takes the oldest rows first", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      const first = await seed(db, org.id, "first");
      await seed(db, org.id, "second");
      // Make `first` unambiguously older, so ordering is asserted rather than
      // observed by insertion luck.
      await db
        .update(outbox)
        .set({ availableAt: new Date(Date.now() - 60_000) })
        .where(eq(outbox.id, first));

      const leased = await leaseDueOutboxEvents(db, { limit: 1, leaseMs: 60_000 });

      expect(leased.map((r) => r.id)).toEqual([first]);
    });
  });

  it("does not lease a row that is not yet due", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      const id = await seed(db, org.id, "invoice.voided");
      await db
        .update(outbox)
        .set({ availableAt: new Date(Date.now() + 3_600_000) })
        .where(eq(outbox.id, id));

      const leased = await leaseDueOutboxEvents(db, { limit: 10, leaseMs: 60_000 });

      expect(leased).toHaveLength(0);
    });
  });

  it("does not lease a row that has already been published", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      const id = await seed(db, org.id, "invoice.voided");
      await db.update(outbox).set({ status: "published" }).where(eq(outbox.id, id));

      const leased = await leaseDueOutboxEvents(db, { limit: 10, leaseMs: 60_000 });

      expect(leased).toHaveLength(0);
    });
  });

  it("returns an empty batch rather than throwing when nothing is due", async () => {
    await withTestTransaction(async ({ db }) => {
      await expect(leaseDueOutboxEvents(db, { limit: 10, leaseMs: 60_000 })).resolves.toEqual([]);
    });
  });
});
