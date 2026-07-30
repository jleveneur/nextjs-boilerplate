import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatMoney } from "./format.ts";

describe("formatMoney", () => {
  it("formats cents as major units in the locale", () => {
    // Strip spaces (including narrow no-break) so the assertion is stable across
    // ICU versions that differ only on grouping separators.
    const euros = formatMoney({ amountMinor: 1999, currency: "EUR" }, "fr").replaceAll(/\s/gu, "");
    expect(euros).toContain("19,99");
    expect(euros).toContain("€");

    const dollars = formatMoney({ amountMinor: 1999, currency: "USD" }, "en").replaceAll(
      /\s/gu,
      "",
    );
    expect(dollars).toContain("19.99");
  });

  it("keeps zero-decimal currencies in whole units", () => {
    // 1999 yen is ¥1,999 — not ¥19.99.
    const yen = formatMoney({ amountMinor: 1999, currency: "JPY" }, "en").replaceAll(/\s/gu, "");
    expect(yen).toContain("1,999");
    expect(yen).not.toContain(".");
  });
});

describe("formatDateTime", () => {
  it("formats a stable instant in each locale", () => {
    const iso = "2026-07-30T12:00:00.000Z";

    expect(formatDateTime(iso, "en")).toMatch(/2026/);
    expect(formatDateTime(iso, "fr")).toMatch(/2026/);
    expect(formatDateTime(new Date(iso), "en")).toMatch(/2026/);
    expect(formatDate(iso, "en")).toMatch(/2026/);
  });

  it("returns an empty string for invalid input", () => {
    // Formatting sits in render paths; a bad timestamp must not throw.
    expect(formatDateTime("not-a-date", "en")).toBe("");
  });
});
