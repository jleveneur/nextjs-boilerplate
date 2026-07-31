import { describe, expect, it } from "vitest";

import { cn } from "./cn.ts";

describe("cn", () => {
  it("merges conflicting Tailwind classes", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("drops falsy values", () => {
    const hide = false;
    expect(cn("rounded", hide && "hidden", undefined, "text-sm")).toBe("rounded text-sm");
  });
});
