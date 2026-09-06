import { describe, expect, it } from "vitest";

import {
  authErrorMessage,
  continueHref,
  firstOrgInvoicesHref,
  getPostAuthCallbackURL,
  getPostAuthHref,
  getSafeNextPath,
} from "./auth-utils.ts";

/**
 * `next` reaches these helpers straight from the query string, so it is
 * attacker-controlled on every sign-in link that can be sent to someone. A
 * post-auth redirect that leaves the origin hands a phisher a login page the
 * user already trusts.
 */
describe("getSafeNextPath", () => {
  it("keeps a same-origin path", () => {
    expect(getSafeNextPath("/en/settings")).toBe("/en/settings");
  });

  it.each([
    ["an absolute URL", "https://evil.example.com/pwn"],
    ["a protocol-relative URL", "//evil.example.com/pwn"],
    ["a scheme-relative URL with credentials", "//user:pw@evil.example.com"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a bare host", "evil.example.com"],
  ])("falls back for %s", (_label, next) => {
    expect(getSafeNextPath(next)).toBe("/");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty", ""],
  ])("falls back for %s", (_label, next) => {
    expect(getSafeNextPath(next)).toBe("/");
  });

  it("honours an explicit fallback", () => {
    expect(getSafeNextPath(null, "/en")).toBe("/en");
    expect(getSafeNextPath("https://evil.example.com", "/en")).toBe("/en");
  });
});

describe("getPostAuthHref", () => {
  it("strips the locale prefix for the next-intl router", () => {
    expect(getPostAuthHref("/en/acme/invoices", "en")).toBe("/acme/invoices");
  });

  it("treats the bare locale as the app root", () => {
    expect(getPostAuthHref("/en", "en")).toBe("/");
    expect(getPostAuthHref("/en/", "en")).toBe("/");
  });

  it("passes through a path that is already locale-relative", () => {
    expect(getPostAuthHref("/acme/invoices", "en")).toBe("/acme/invoices");
  });

  it("falls back to the app root for an off-origin target", () => {
    expect(getPostAuthHref("//evil.example.com", "en")).toBe("/");
  });

  it("does not strip a locale that only prefixes the path textually", () => {
    // `/enterprise` starts with "en" but is not the `en` locale segment.
    expect(getPostAuthHref("/enterprise", "en")).toBe("/enterprise");
  });
});

describe("getPostAuthCallbackURL", () => {
  it("routes to the org resolver when there is no target", () => {
    expect(getPostAuthCallbackURL(null, "en")).toBe("/en/continue");
    expect(getPostAuthCallbackURL("/fr", "fr")).toBe("/fr/continue");
  });

  it("rebuilds a locale-prefixed absolute-on-origin path", () => {
    expect(getPostAuthCallbackURL("/en/acme/invoices", "en")).toBe("/en/acme/invoices");
  });

  /**
   * Better Auth hands this value to a browser redirect, so it must stay on the
   * origin no matter what arrived in `next`.
   */
  it.each(["https://evil.example.com/pwn", "//evil.example.com/pwn", "javascript:alert(1)"])(
    "never leaves the origin for %s",
    (next) => {
      const url = getPostAuthCallbackURL(next, "en");

      expect(url.startsWith("/en/")).toBe(true);
      expect(new URL(url, "https://app.example.com").origin).toBe("https://app.example.com");
    },
  );
});

describe("firstOrgInvoicesHref", () => {
  it("links to the first organization", () => {
    expect(firstOrgInvoicesHref([{ slug: "acme" }, { slug: "other" }])).toBe("/acme/invoices");
  });

  it.each([
    ["no organizations", []],
    ["null", null],
    ["undefined", undefined],
    ["a blank slug", [{ slug: "" }]],
  ])("falls back for %s", (_label, orgs) => {
    expect(firstOrgInvoicesHref(orgs)).toBe("/");
  });

  it("honours an explicit fallback", () => {
    expect(firstOrgInvoicesHref([], "/en/continue")).toBe("/en/continue");
  });
});

describe("continueHref", () => {
  it("is the locale-relative org resolver path", () => {
    expect(continueHref()).toBe("/continue");
  });
});

describe("authErrorMessage", () => {
  it("prefers the error's own message", () => {
    expect(authErrorMessage(new Error("Invalid credentials"), "fallback")).toBe(
      "Invalid credentials",
    );
    expect(authErrorMessage({ message: "Rate limited" }, "fallback")).toBe("Rate limited");
  });

  it.each([
    ["a message-less object", {}],
    ["an empty message", { message: "" }],
    ["a non-string message", { message: 42 }],
    ["null", null],
    ["a string", "boom"],
  ])("falls back for %s", (_label, error) => {
    expect(authErrorMessage(error, "Something went wrong")).toBe("Something went wrong");
  });
});
