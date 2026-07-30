import { describe, expect, it } from "vitest";

import { generateUuidV7 } from "@repo/utils";

import {
  createInvoiceInputSchema,
  invoiceSchema,
  invoiceStatusSchema,
  voidInvoiceInputSchema,
} from "./invoice.ts";

describe("invoice contracts", () => {
  it("accepts a valid invoice DTO", () => {
    const now = new Date().toISOString();
    const parsed = invoiceSchema.parse({
      id: generateUuidV7(),
      organizationId: generateUuidV7(),
      number: "INV-001",
      status: "open",
      amountMinor: 1_00,
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    });

    expect(parsed.number).toBe("INV-001");
    expect(parsed.amountMinor).toBe(100);
  });

  it("defaults create input status and currency", () => {
    const parsed = createInvoiceInputSchema.parse({
      number: "INV-002",
      amountMinor: 2_50,
    });

    expect(parsed.status).toBe("draft");
    expect(parsed.currency).toBe("USD");
  });

  it("rejects void input without a UUIDv7", () => {
    expect(() => voidInvoiceInputSchema.parse({ invoiceId: "not-a-uuid" })).toThrow(/UUIDv7/);
  });

  it("enumerates invoice statuses", () => {
    expect(invoiceStatusSchema.options).toEqual(["draft", "open", "paid", "void"]);
  });
});
