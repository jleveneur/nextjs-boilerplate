import { describe, expect, it, vi } from "vitest";

/** Re-import the module with `NEXT_PUBLIC_APP_URL` stubbed, since it reads env at call time. */
async function load(value: string): Promise<string> {
  vi.resetModules();
  vi.doMock("@/env/client.ts", () => ({ env: { NEXT_PUBLIC_APP_URL: value } }));
  const { publicUrl } = await import("./public-url.ts");
  return publicUrl();
}

describe("publicUrl", () => {
  it("returns the configured origin unchanged", async () => {
    await expect(load("https://app.example")).resolves.toBe("https://app.example");
  });

  it("strips a trailing slash", async () => {
    // `${publicUrl()}/sitemap.xml` is how every caller uses this, so a trailing
    // slash in the env value produces `//sitemap.xml` — a different URL, which
    // some crawlers follow and others reject.
    await expect(load("https://app.example/")).resolves.toBe("https://app.example");
    await expect(load("https://app.example///")).resolves.toBe("https://app.example");
  });

  it("keeps a base path", async () => {
    // An app mounted under a sub-path still needs it in absolute URLs.
    await expect(load("https://example.com/app/")).resolves.toBe("https://example.com/app");
  });
});
