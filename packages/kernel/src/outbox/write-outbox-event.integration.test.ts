import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { outbox } from "@repo/db/schema";
import { setupDbIntegrationTests } from "@repo/db/testing";

import { createSequenceIdGenerator } from "../testing/uuid-id-generator.ts";
import { writeOutboxEvent } from "./write-outbox-event.ts";

describe("writeOutboxEvent", () => {
  const { withTestTransaction } = setupDbIntegrationTests();

  it("inserts a pending outbox row for the organization", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      const ids = createSequenceIdGenerator();
      const outboxId = ids.outboxId();

      const written = await writeOutboxEvent({
        db,
        id: outboxId,
        organizationId: org.id,
        eventType: "invoice.voided",
        payload: { invoiceId: ids.invoiceId() },
      });

      expect(written.id).toBe(outboxId);
      expect(written.eventType).toBe("invoice.voided");

      const [row] = await db.select().from(outbox).where(eq(outbox.id, outboxId));
      expect(row?.status).toBe("pending");
      expect(row?.organizationId).toBe(org.id);
    });
  });
});
