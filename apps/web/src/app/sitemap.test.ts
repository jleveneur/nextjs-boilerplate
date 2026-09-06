import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-url.ts", () => ({ publicUrl: () => "https://app.example" }));

const { default: sitemap } = await import("./sitemap.ts");
const { default: robots } = await import("./robots.ts");

describe("sitemap", () => {
  const entries = sitemap();

  it("lists the marketing root and the two auth entry points", () => {
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://app.example/en",
      "https://app.example/en/sign-in",
      "https://app.example/en/sign-up",
    ]);
  });

  it("declares every locale as an alternate of each entry", () => {
    // `localePrefix: "always"` makes /en/sign-in and /fr/sign-in two URLs with
    // the same content. Without this map a crawler reads that as duplication and
    // picks one, and the French page stops being served to French searchers.
    for (const entry of entries) {
      expect(entry.alternates?.languages).toEqual({
        en: expect.stringContaining("/en"),
        fr: expect.stringContaining("/fr"),
      });
    }
  });

  it("lists no tenant or authenticated URL", () => {
    // Org slugs are tenant data and every page under them redirects to sign-in,
    // so advertising them would leak customer names and publish 307s.
    for (const entry of entries) {
      expect(entry.url).not.toMatch(/\/(invoices|settings|billing)/u);
    }
  });

  it("uses absolute URLs on the configured origin", () => {
    for (const entry of entries) {
      expect(entry.url.startsWith("https://app.example/")).toBe(true);
    }
  });
});

describe("robots", () => {
  const rules = robots();
  const disallow = Array.isArray(rules.rules) ? [] : (rules.rules?.disallow ?? []);

  it("points at the sitemap on the same origin", () => {
    expect(rules.sitemap).toBe("https://app.example/sitemap.xml");
  });

  it.each([["verify-email"], ["reset-password"], ["magic-link"], ["accept-invitation"]])(
    "disallows the token-carrying %s flow",
    (flow) => {
      // Crawling one of these consumes a single-use token, so the recipient's link
      // is dead before they click it. That is a functional break, not just an SEO
      // preference.
      expect(disallow).toContain(`/*/${flow}`);
    },
  );

  it("disallows the api surface", () => {
    expect(disallow).toContain("/api/");
  });

  it("keeps sign-in and sign-up crawlable", () => {
    // Ordinary public pages, and often the right result for a product-name search.
    expect(disallow).not.toContain("/*/sign-in");
    expect(disallow).not.toContain("/*/sign-up");
  });
});
