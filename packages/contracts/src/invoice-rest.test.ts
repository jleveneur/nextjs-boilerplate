import { describe, expect, it } from "vitest";

import type { Invoice } from "./invoice.ts";
import {
  createInvoiceRestInputSchema,
  fromCreateInvoiceRest,
  toInvoiceRest,
  toInvoiceRestPage,
} from "./invoice-rest.ts";

const sample: Invoice = {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fixture brand
  id: "01900000-0000-7000-8000-000000000010" as Invoice["id"],
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fixture brand
  organizationId: "01900000-0000-7000-8000-000000000001" as Invoice["organizationId"],
  number: "INV-1",
  status: "open",
  amountMinor: 2500,
  currency: "USD",
  createdAt: "2026-01-15T12:00:00.000Z",
  updatedAt: "2026-01-15T12:00:00.000Z",
};

describe("invoice REST mappers", () => {
  it("maps camelCase invoice to snake_case", () => {
    expect(toInvoiceRest(sample)).toEqual({
      id: sample.id,
      organization_id: sample.organizationId,
      number: "INV-1",
      status: "open",
      amount_minor: 2500,
      currency: "USD",
      created_at: sample.createdAt,
      updated_at: sample.updatedAt,
    });
  });

  it("includes deleted_at when present", () => {
    expect(
      toInvoiceRest({
        ...sample,
        deletedAt: "2026-02-01T00:00:00.000Z",
      }),
    ).toMatchObject({ deleted_at: "2026-02-01T00:00:00.000Z" });
  });

  it("maps create body to camelCase input", () => {
    const parsed = createInvoiceRestInputSchema.parse({
      number: "INV-2",
      amount_minor: 100,
    });
    expect(fromCreateInvoiceRest(parsed)).toEqual({
      number: "INV-2",
      amountMinor: 100,
      currency: "USD",
      status: "draft",
    });
  });

  it("maps a page to next_cursor", () => {
    expect(
      toInvoiceRestPage({
        data: [sample],
        nextCursor: "cursor-1",
      }),
    ).toEqual({
      data: [toInvoiceRest(sample)],
      next_cursor: "cursor-1",
    });
  });
});
