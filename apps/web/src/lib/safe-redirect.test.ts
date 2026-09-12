import { describe, expect, it } from "vitest"

import { safeRedirect } from "./safe-redirect.ts"

describe("safeRedirect", () => {
  it("keeps a path on this site", () => {
    expect(safeRedirect("/accept-invitation/abc", "/dashboard")).toBe("/accept-invitation/abc")
  })

  it("falls back when nothing was asked for", () => {
    expect(safeRedirect(undefined, "/dashboard")).toBe("/dashboard")
  })

  it("rejects an absolute URL", () => {
    expect(safeRedirect("https://evil.example/phish", "/dashboard")).toBe("/dashboard")
  })

  it("rejects a protocol-relative URL, which browsers follow off-site", () => {
    expect(safeRedirect("//evil.example/phish", "/dashboard")).toBe("/dashboard")
  })

  it("rejects a bare path with no leading slash", () => {
    expect(safeRedirect("evil.example", "/dashboard")).toBe("/dashboard")
  })
})
