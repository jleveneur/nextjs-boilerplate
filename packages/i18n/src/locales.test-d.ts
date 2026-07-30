import { describe, expectTypeOf, it } from "vitest";

import type { Locale } from "./locales.ts";

describe("Locale", () => {
  it("is the union of the locales list", () => {
    expectTypeOf<Locale>().toEqualTypeOf<"en" | "fr">();
  });
});
