import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor, type JsonValue } from "./cursor.ts";

// A non-ASCII fixture, and a fragment of base64 that happens to look like a word.
// cspell:ignore Brûlée Ijox

describe("encodeCursor / decodeCursor", () => {
  it("round-trips a keyset position", () => {
    const position = { createdAt: "2026-07-30T12:00:00.000Z", id: "017f22e2-79b0-7cc3-98c4-dc0c" };

    expect(decodeCursor(encodeCursor(position))).toStrictEqual(position);
  });

  it("round-trips every JSON shape", () => {
    const values: readonly JsonValue[] = [
      "text",
      42,
      -1.5,
      0,
      true,
      false,
      null,
      [],
      [1, "two", null],
      {},
      { nested: { deep: [1, { deeper: true }] } },
    ];

    for (const value of values) {
      expect(decodeCursor(encodeCursor(value))).toStrictEqual(value);
    }
  });

  it("survives non-ASCII content", () => {
    // Cursors can carry a name or a title as a sort key. Encoding through
    // `btoa` alone would throw on these, which is why the bytes go through
    // TextEncoder first.
    const value = { title: "Crème Brûlée 日本語 🎉" };

    expect(decodeCursor(encodeCursor(value))).toStrictEqual(value);
  });

  it("produces output that needs no URL or JSON escaping", () => {
    // The reason for base64url over base64: a cursor goes in a query string, and
    // `+` there decodes as a space, silently corrupting the value.
    const encoded = encodeCursor({ createdAt: "2026-07-30T12:00:00.000Z", offset: 12_345 });

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it("is stable for the same input", () => {
    // Cursors appear in cache keys and test snapshots.
    const value = { a: 1, b: 2 };

    expect(encodeCursor(value)).toBe(encodeCursor(value));
  });

  it("does not resemble its contents", () => {
    // Opacity is the point: a client that can read the shape will construct its
    // own, and the sort key becomes an unchangeable public contract.
    const encoded = encodeCursor({ createdAt: "2026-07-30T12:00:00.000Z" });

    expect(encoded).not.toContain("createdAt");
    expect(encoded).not.toContain("2026");
  });
});

describe("decodeCursor", () => {
  it("returns undefined rather than throwing on malformed input", () => {
    // Cursors come from clients, so garbage is expected traffic, not a bug. The
    // caller must reject the request — falling back to page one leaves a client
    // paginating forever over the first page.
    for (const value of [
      "",
      "not base64!",
      "a b",
      "====",
      "%%%",
      "eyJhIjox", // valid base64url, truncated JSON
      "AAAA", // valid base64url, not JSON
      "AAAAA", // in the alphabet, but no padding makes this a valid base64 length
    ]) {
      expect(decodeCursor(value)).toBeUndefined();
    }
  });

  it("rejects standard base64 that we would never emit", () => {
    // `atob` accepts `+` and `/`. Allowing them would give clients a second,
    // undocumented cursor format that later has to keep working.
    const standard = btoa(JSON.stringify({ a: "?".repeat(20) }));

    expect(standard).toMatch(/[+/=]/);
    expect(decodeCursor(standard)).toBeUndefined();
  });

  it("rejects bytes that are not valid UTF-8", () => {
    // Without `fatal: true` these decode to replacement characters instead of
    // failing, so arbitrary binary could parse as JSON.
    const invalidUtf8 = Uint8Array.from([0xff, 0xfe, 0xfd]);
    let binary = "";
    for (const byte of invalidUtf8) binary += String.fromCodePoint(byte);
    const encoded = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");

    expect(decodeCursor(encoded)).toBeUndefined();
  });

  it("does not treat a tampered cursor as trustworthy", () => {
    // These are not signed, and this test records that rather than implying
    // otherwise: a client can craft any payload it likes. The API layer adds the
    // HMAC, and until then every decoded field is validated and organisation-scoped
    // before it reaches a query.
    const forged = encodeCursor({ organizationId: "someone-elses-org" });

    expect(decodeCursor(forged)).toStrictEqual({ organizationId: "someone-elses-org" });
  });
});
