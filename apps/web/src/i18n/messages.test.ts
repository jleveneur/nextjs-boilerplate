import { describe, expect, it } from "vitest";

import { locales } from "@repo/i18n";

import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/**
 * Catalog parity.
 *
 * `request.ts` types `loadMessages` as `Messages`, so a key *missing* from a
 * translated catalog is already a compile error. These tests cover what the type
 * system cannot see:
 *
 * - **Extra keys.** A structural check accepts a superset, so a key deleted from
 *   `en.json` leaves a translation behind that nothing renders.
 * - **Empty values.** `""` satisfies `string` and renders as nothing at all,
 *   which is worse than an untranslated string because it looks like a layout bug.
 * - **Placeholder drift.** `"Hello {name}"` against `"Bonjour"` type-checks and
 *   renders — it silently drops the name. This is the failure that survives every
 *   other guard in the repo.
 */

const CATALOGS: Record<string, unknown> = { en, fr };

/** Every leaf as `Namespace.key` → value, so nesting does not hide a mismatch. */
function flatten(value: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();

  if (typeof value === "string") {
    out.set(prefix, value);
    return out;
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, nested] of Object.entries(value)) {
      const path = prefix === "" ? key : `${prefix}.${key}`;
      for (const [k, v] of flatten(nested, path)) out.set(k, v);
    }
  }

  return out;
}

/** ICU placeholder names, ignoring whatever formatting follows the name. */
function placeholders(message: string): Set<string> {
  return new Set(
    [...message.matchAll(/\{\s*(?<name>[a-zA-Z0-9_]+)\s*[,}]/gu)].flatMap((match) => {
      const name = match.groups?.["name"];
      return name === undefined ? [] : [name];
    }),
  );
}

const source = flatten(en);

describe("message catalogs", () => {
  it("ships a catalog for every supported locale", () => {
    // A locale added to @repo/i18n without a catalog routes to a page that
    // renders the English fallback under a French URL.
    for (const locale of locales) {
      expect(Object.keys(CATALOGS)).toContain(locale);
    }
  });

  it("has no empty values in the source catalog", () => {
    for (const [key, value] of source) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  describe.each(Object.entries(CATALOGS).filter(([locale]) => locale !== "en"))(
    "%s",
    (locale, catalog) => {
      const translated = flatten(catalog);

      it("defines exactly the keys the source defines", () => {
        const missing = [...source.keys()].filter((key) => !translated.has(key));
        const extra = [...translated.keys()].filter((key) => !source.has(key));

        // Reported as lists rather than a count so a failure names the keys.
        expect({ missing, extra }).toEqual({ missing: [], extra: [] });
      });

      it("has no empty values", () => {
        // An untranslated string is a visible problem someone fixes. An empty one
        // renders as a gap and reads as a broken layout.
        for (const [key, value] of translated) {
          expect(value.trim(), `${locale}.${key}`).not.toBe("");
        }
      });

      it("keeps every placeholder the source message uses", () => {
        const drift = [...source].flatMap(([key, message]) => {
          const expected = placeholders(message);
          if (expected.size === 0) return [];

          const actual = placeholders(translated.get(key) ?? "");
          const lost = [...expected].filter((name) => !actual.has(name));
          const invented = [...actual].filter((name) => !expected.has(name));

          return lost.length === 0 && invented.length === 0 ? [] : [{ key, lost, invented }];
        });

        expect(drift).toEqual([]);
      });
    },
  );
});

describe("placeholders", () => {
  // The helper decides whether the parity check above sees anything at all, so
  // its own parsing is asserted rather than assumed.
  it("finds simple and formatted placeholders", () => {
    expect([...placeholders("Hello {name}")]).toEqual(["name"]);
    expect([...placeholders("{count, plural, one {# item} other {# items}}")]).toEqual(["count"]);
    expect([...placeholders("{a} and {b}")]).toEqual(["a", "b"]);
  });

  it("finds nothing in a message with no placeholders", () => {
    expect([...placeholders("Sign in")]).toEqual([]);
    expect([...placeholders("")]).toEqual([]);
  });
});
