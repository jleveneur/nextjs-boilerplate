import { describe, expect, it } from "vitest";

import { isPostHogIngestPath } from "./ingest-path.ts";

/**
 * The analytics rewrite has to bypass locale routing in both shapes a request
 * can arrive in: unprefixed (the SDK's own base path) and locale-prefixed
 * (anything that went through next-intl first).
 */
describe("isPostHogIngestPath", () => {
  it.each([
    "/ingest",
    "/ingest/",
    "/ingest/decide",
    "/ingest/static/array.js",
    "/en/ingest",
    "/fr/ingest/decide",
  ])("matches %s", (pathname) => {
    expect(isPostHogIngestPath(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/en",
    "/en/settings",
    // Must not match a product route that merely starts with the same letters.
    "/ingestion",
    "/en/ingestion",
    // `ingest` has to be the segment right after the locale, not anywhere.
    "/en/acme/ingest",
  ])("does not match %s", (pathname) => {
    expect(isPostHogIngestPath(pathname)).toBe(false);
  });
});
