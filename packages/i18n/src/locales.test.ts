import { describe, expect, it } from "vitest";

import { defaultLocale, isLocale, locales } from "./locales.ts";
import { routing } from "./routing.ts";

describe("locales", () => {
  it("includes the default locale", () => {
    expect(locales).toContain(defaultLocale);
  });

  it("narrows trusted strings", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale("EN")).toBe(false);
  });
});

describe("routing", () => {
  it("reuses the same locale list and default", () => {
    // A second copy of the list in routing is how prefixes and message loading
    // drift apart. One source of truth.
    expect(routing.locales).toBe(locales);
    expect(routing.defaultLocale).toBe(defaultLocale);
    expect(routing.localePrefix).toBe("always");
  });
});
