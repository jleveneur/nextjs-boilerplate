import { describe, expect, it } from "vitest";

import { setupDbIntegrationTests } from "@repo/db/testing";
import type { InvoiceId } from "@repo/types";
import { generateUuidV7 } from "@repo/utils";

import { findInvoiceById, insertInvoice, updateInvoiceStatus } from "./billing.repository.ts";

function brandInvoiceId(id: string): InvoiceId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as InvoiceId;
}

describe("billing.repository", () => {
  const { withTestTransaction } = setupDbIntegrationTests();

  it("inserts and finds an invoice for the tenant", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      const id = brandInvoiceId(generateUuidV7());

      await insertInvoice(
        { organizationId: org.id, db },
        {
          id,
          number: "INV-100",
          status: "open",
          amountMinor: 500,
          currency: "USD",
        },
      );

      const found = await findInvoiceById({ organizationId: org.id, db }, id);
      expect(found?.number).toBe("INV-100");
      expect(found?.amountMinor).toBe(500);
    });
  });

  it("does not return another tenant's invoice", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const orgA = await factories.makeOrganization({ slug: "bill-a" });
      const orgB = await factories.makeOrganization({ slug: "bill-b" });
      const created = await factories.makeInvoice({
        organizationId: orgB.id,
        number: "INV-B",
      });

      const found = await findInvoiceById({ organizationId: orgA.id, db }, created.id);
      expect(found).toBeNull();
    });
  });

  it("updates status within the tenant", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      const created = await factories.makeInvoice({
        organizationId: org.id,
        status: "open",
      });

      const updated = await updateInvoiceStatus({ organizationId: org.id, db }, created.id, "void");
      expect(updated?.status).toBe("void");
    });
  });
});
