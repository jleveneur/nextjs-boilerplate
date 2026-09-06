import { describe, expect, it } from "vitest";

import { escapeHtml } from "./escape-html.ts";

describe("escapeHtml", () => {
  it("escapes the five characters that change meaning in HTML", () => {
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml(">")).toBe("&gt;");
    expect(escapeHtml('"')).toBe("&quot;");
    expect(escapeHtml("'")).toBe("&#39;");
  });

  it("leaves everything else untouched", () => {
    // Accents, emoji, and non-Latin scripts are not markup and must survive
    // verbatim: an organisation named "Crème" should read as itself in the email.
    // cspell:ignore Crème Brûlée 株式会社
    expect(escapeHtml("Crème Brûlée 株式会社 🚀")).toBe("Crème Brûlée 株式会社 🚀");
    expect(escapeHtml("")).toBe("");
  });

  it("does not double-escape the ampersands it emits", () => {
    // The ordering bug this function is written to avoid. Escaping `&` in a pass
    // after `<` rewrites the `&` in `&lt;` and produces `&amp;lt;`, which renders
    // as the literal text "&lt;" — visibly wrong, and only in the escaped case.
    expect(escapeHtml("<b>")).toBe("&lt;b&gt;");
    expect(escapeHtml("a & b < c")).toBe("a &amp; b &lt; c");
  });

  it("neutralises a tag injected through a display name", () => {
    // The invitation email is the real vector: `inviterName` and
    // `organizationName` are free text the sender chooses, and they land in a
    // message that legitimately originates from our domain.
    expect(escapeHtml('Acme<a href="https://phish.example">click</a>')).toBe(
      "Acme&lt;a href=&quot;https://phish.example&quot;&gt;click&lt;/a&gt;",
    );
  });

  it("keeps an escaped value inside its attribute", () => {
    // Breaking out of a quoted attribute needs a `"`; with it escaped, the
    // injected `onerror` stays part of the value instead of becoming markup.
    const escaped = escapeHtml('" onerror="alert(1)');
    expect(escaped).not.toContain('"');
    expect(`<img alt="${escaped}">`).toBe('<img alt="&quot; onerror=&quot;alert(1)">');
  });

  it("escapes query separators in a URL", () => {
    // `&` between query parameters belongs in an href as `&amp;`. The link still
    // resolves to the same target once the client unescapes it.
    expect(escapeHtml("https://app.example/accept?token=abc&org=def")).toBe(
      "https://app.example/accept?token=abc&amp;org=def",
    );
  });
});
