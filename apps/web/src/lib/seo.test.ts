import { describe, expect, it, vi } from "vitest";

vi.mock("./public-url.ts", () => ({ publicUrl: () => "https://app.example" }));

const { PUBLIC_PATHS, languageAlternates, localizedMetadata, localizedUrl } =
  await import("./seo.ts");

describe("localizedMetadata", () => {
  it("gives each path its own canonical", () => {
    // The regression this helper exists for. Declaring `alternates` once in the
    // locale layout looked right and shipped a canonical of `/fr` on every page
    // under it — telling a crawler that `/fr/sign-in` *is* the home page, which
    // removes it from the index rather than merely failing to help it.
    const home = localizedMetadata("fr", "").alternates?.canonical;
    const signIn = localizedMetadata("fr", "/sign-in").alternates?.canonical;

    expect(home).toBe("https://app.example/fr");
    expect(signIn).toBe("https://app.example/fr/sign-in");
    expect(home).not.toBe(signIn);
  });

  it("points the canonical at the requested locale", () => {
    expect(localizedMetadata("en", "/sign-up").alternates?.canonical).toBe(
      "https://app.example/en/sign-up",
    );
    expect(localizedMetadata("fr", "/sign-up").alternates?.canonical).toBe(
      "https://app.example/fr/sign-up",
    );
  });

  it("lists every locale plus x-default as alternates of the same path", () => {
    const languages = localizedMetadata("fr", "/sign-in").alternates?.languages;

    expect(languages).toEqual({
      en: "https://app.example/en/sign-in",
      fr: "https://app.example/fr/sign-in",
      // For a crawler with no locale preference to express.
      "x-default": "https://app.example/en/sign-in",
    });
  });

  it("keeps og:url in step with the canonical", () => {
    // Two tags asserting different URLs for the same page is a contradiction a
    // crawler resolves in its own favour, not ours.
    for (const path of PUBLIC_PATHS) {
      const metadata = localizedMetadata("fr", path);
      expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
    }
  });
});

describe("localizedUrl", () => {
  it("builds an absolute URL under the locale prefix", () => {
    expect(localizedUrl("en", "")).toBe("https://app.example/en");
    expect(localizedUrl("fr", "/sign-in")).toBe("https://app.example/fr/sign-in");
  });

  it("never produces a double slash for the locale root", () => {
    // `""` is the locale root, so a naive `${locale}/${path}` would emit `/en/`.
    expect(localizedUrl("en", "")).not.toContain("//en");
    expect(localizedUrl("en", "")).not.toMatch(/\/$/u);
  });
});

describe("languageAlternates", () => {
  it("covers every supported locale", () => {
    expect(Object.keys(languageAlternates("/sign-in"))).toEqual(["en", "fr"]);
  });
});
