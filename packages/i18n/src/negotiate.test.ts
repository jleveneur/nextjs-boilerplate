import { describe, expect, it } from "vitest";

import { negotiateLocale, negotiateLocaleFromRequest } from "./negotiate.ts";

// A deliberately unreadable quality value, not a word.
// cspell:ignore notanumber

describe("negotiateLocale", () => {
  it("falls back to the default locale with no evidence", () => {
    expect(negotiateLocale()).toBe("en");
    expect(negotiateLocale({})).toBe("en");
    expect(negotiateLocale({ cookie: null, acceptLanguage: null })).toBe("en");
  });

  it("prefers an explicit cookie over the browser's header", () => {
    // The cookie is a choice the visitor made; Accept-Language is a default they
    // may never have looked at. An email that ignores the deliberate choice is
    // the more visible failure.
    expect(negotiateLocale({ cookie: "NEXT_LOCALE=fr", acceptLanguage: "en-US,en;q=0.9" })).toBe(
      "fr",
    );
  });

  it("reads the cookie out of a crowded header", () => {
    expect(negotiateLocale({ cookie: "session=abc; NEXT_LOCALE=fr; theme=dark" })).toBe("fr");
    expect(negotiateLocale({ cookie: "a=1;NEXT_LOCALE=fr;b=2" })).toBe("fr");
  });

  it("ignores a cookie naming an unsupported locale", () => {
    // The cookie is attacker-settable, so an unknown value must fall through to
    // negotiation rather than propagate as a locale nothing can render.
    expect(negotiateLocale({ cookie: "NEXT_LOCALE=de", acceptLanguage: "fr" })).toBe("fr");
    expect(negotiateLocale({ cookie: "NEXT_LOCALE=../../etc/passwd" })).toBe("en");
  });

  it("does not match a cookie whose name merely ends with the right suffix", () => {
    expect(negotiateLocale({ cookie: "MY_NEXT_LOCALE=fr" })).toBe("en");
  });

  it("matches a base tag when the header carries a region", () => {
    expect(negotiateLocale({ acceptLanguage: "fr-CA,fr;q=0.9,en;q=0.8" })).toBe("fr");
    expect(negotiateLocale({ acceptLanguage: "en-GB" })).toBe("en");
  });

  it("honours quality values rather than header order", () => {
    // `de` comes first but is the weakest preference; `fr` is what this visitor
    // actually reads.
    expect(negotiateLocale({ acceptLanguage: "de;q=0.2,fr;q=0.9" })).toBe("fr");
  });

  it("keeps header order for equal quality", () => {
    // `en, fr` with both implicitly q=1 means English first. This holds only
    // because the sort is stable, so it is asserted rather than assumed.
    expect(negotiateLocale({ acceptLanguage: "en,fr" })).toBe("en");
    expect(negotiateLocale({ acceptLanguage: "fr,en" })).toBe("fr");
    expect(negotiateLocale({ acceptLanguage: "fr;q=0.8,en;q=0.8" })).toBe("fr");
  });

  it("skips explicitly refused languages", () => {
    // q=0 means "not acceptable", so `fr` must not win here.
    expect(negotiateLocale({ acceptLanguage: "fr;q=0,en;q=0.5" })).toBe("en");
  });

  it("falls back when no supported language appears", () => {
    expect(negotiateLocale({ acceptLanguage: "de,es;q=0.9" })).toBe("en");
    expect(negotiateLocale({ acceptLanguage: "*" })).toBe("en");
    expect(negotiateLocale({ acceptLanguage: "" })).toBe("en");
  });

  it("tolerates a malformed header instead of throwing", () => {
    // Negotiation sits in a send path. Garbage in a header must degrade to a
    // usable locale, never take down the email.
    expect(negotiateLocale({ acceptLanguage: ";;;" })).toBe("en");
    expect(negotiateLocale({ cookie: "malformed" })).toBe("en");
  });

  it("keeps the language when only its quality value is unreadable", () => {
    // `fr;q=notanumber` is a valid language tag with a broken parameter. The
    // client still said French, so discarding the tag would lose the one piece of
    // information the header actually carried. Unreadable quality reads as q=1.
    expect(negotiateLocale({ acceptLanguage: "fr;q=notanumber" })).toBe("fr");
    // A quality that looks numeric but parses to NaN is refused rather than
    // promoted, so it cannot outrank a well-formed preference.
    expect(negotiateLocale({ acceptLanguage: "fr;q=.,en;q=0.5" })).toBe("en");
  });
});

describe("negotiateLocaleFromRequest", () => {
  it("reads both headers off the request", () => {
    const request = new Request("https://app.example/", {
      headers: { cookie: "NEXT_LOCALE=fr", "accept-language": "en" },
    });
    expect(negotiateLocaleFromRequest(request)).toBe("fr");
  });

  it("negotiates from Accept-Language when there is no cookie", () => {
    const request = new Request("https://app.example/", {
      headers: { "accept-language": "fr-FR,fr;q=0.9" },
    });
    expect(negotiateLocaleFromRequest(request)).toBe("fr");
  });

  it("falls back when there is no request at all", () => {
    // Better Auth omits the request for server-initiated sends, and a background
    // job never has one.
    expect(negotiateLocaleFromRequest(undefined)).toBe("en");
    expect(negotiateLocaleFromRequest(new Request("https://app.example/"))).toBe("en");
  });
});
