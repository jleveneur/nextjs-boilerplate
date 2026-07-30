import { describe, expect, it } from "vitest";

import { slugify } from "./slugify.ts";

// Test fixtures in several scripts, plus the mangled output that appears when the
// folding is wrong. Deliberately file-scoped — none of these are project vocabulary.
// cspell:ignore Brûlée brulee creme crme brle Straße strasse Ærø aero Bogotá bogota
// cspell:ignore مرحبا

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Q3 Financial Report")).toBe("q3-financial-report");
  });

  it("folds accented Latin characters to their base letter", () => {
    // The NFKD step. Without it these code points match nothing and disappear
    // outright, so "Crème Brûlée" becomes "crme-brle" — mangled rather than
    // transliterated, and nobody notices until a French customer uploads a file.
    expect(slugify("Crème Brûlée")).toBe("creme-brulee");
    expect(slugify("Ærø Straße")).toBe("aero-strasse");
    expect(slugify("Bogotá")).toBe("bogota");
  });

  it("drops punctuation and collapses the gaps", () => {
    expect(slugify("annual report (final) -- v2.pdf")).toBe("annual-report-final-v2-pdf");
    expect(slugify("a---b___c")).toBe("a-b-c");
  });

  it("does not leave leading or trailing separators", () => {
    // A trailing hyphen is how a storage key ends up with an empty final segment.
    expect(slugify("  spaced  ")).toBe("spaced");
    expect(slugify("...dots...")).toBe("dots");
    expect(slugify("-leading-and-trailing-")).toBe("leading-and-trailing");
  });

  it("returns an empty string when nothing survives", () => {
    // Documented and asserted rather than papered over with a fallback, because a
    // caller interpolating this without checking builds a malformed key. Scripts
    // with no ASCII equivalent are the common case, not the exotic one.
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
    expect(slugify("日本語")).toBe("");
    expect(slugify("مرحبا")).toBe("");
    expect(slugify("🎉🎉")).toBe("");
  });

  it("produces only URL-safe and filesystem-safe characters", () => {
    // The output lands in an S3 key and a URL path, so the guarantee is checked
    // against adversarial input rather than assumed from the implementation.
    const hostile = "../../etc/passwd?x=1&y=2#frag \u0000 <script>";

    expect(slugify(hostile)).toMatch(/^[a-z0-9-]*$/);
    expect(slugify(hostile)).not.toContain("..");
    expect(slugify(hostile)).not.toContain("/");
  });

  it("is idempotent", () => {
    // Slugs get re-slugified by accident when a value passes through two layers.
    const once = slugify("Crème Brûlée (final).pdf");

    expect(slugify(once)).toBe(once);
  });
});
