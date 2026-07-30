import { describe, expect, it } from "vitest";

import { currencyCodeSchema, moneySchema } from "./money.ts";

describe("moneySchema", () => {
  it("accepts integer minor units and an ISO currency", () => {
    expect(moneySchema.parse({ amountMinor: 1999, currency: "EUR" })).toStrictEqual({
      amountMinor: 1999,
      currency: "EUR",
    });
  });

  it("allows zero and negative amounts", () => {
    // Credits and refunds are money too.
    expect(moneySchema.parse({ amountMinor: 0, currency: "USD" }).amountMinor).toBe(0);
    expect(moneySchema.parse({ amountMinor: -500, currency: "USD" }).amountMinor).toBe(-500);
  });

  it("rejects fractional minor units", () => {
    // A float here is the bug this type exists to prevent.
    expect(() => moneySchema.parse({ amountMinor: 19.99, currency: "EUR" })).toThrow();
  });

  it("rejects a lowercase or short currency code", () => {
    expect(() => currencyCodeSchema.parse("eur")).toThrow();
    expect(() => currencyCodeSchema.parse("EU")).toThrow();
  });
});
