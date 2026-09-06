/**
 * HTML escaping for values interpolated into markup built as a string.
 *
 * The repo's rule is that user input is validated at the boundary and rendered
 * by something that escapes for you — JSX, or a template engine. This helper
 * exists for the one place that rule does not reach: transactional email bodies
 * assembled with a template literal, where there is no renderer in between.
 *
 * It is not a sanitiser. It does not accept HTML and remove the dangerous parts;
 * it takes a value that is *not* markup and makes it safe to place inside markup.
 * If you find yourself reaching for it to clean up untrusted HTML, the answer is
 * a different tool.
 */

/**
 * Escapes the five characters that change meaning inside HTML.
 *
 * ```ts
 * escapeHtml('Acme <script>alert(1)</script>');
 * // "Acme &lt;script&gt;alert(1)&lt;/script&gt;"
 * ```
 *
 * Safe for both text content and quoted attribute values:
 *
 * ```ts
 * `<a href="${escapeHtml(url)}">${escapeHtml(name)}</a>`;
 * ```
 *
 * Both quote characters are covered even though the common case is text content.
 * A value that is safe in text but not in a single-quoted attribute fails in a way
 * the caller cannot see from the call site, and covering both costs one more pass.
 *
 * Escaping a URL is correct rather than merely harmless — an `&` separating query
 * parameters is supposed to appear as `&amp;` in an `href`, and a mail client that
 * parses the body strictly is entitled to treat the raw form as an error. It does
 * not make an attacker-supplied `javascript:` URL safe, so a URL whose scheme you
 * do not control still needs checking before it gets here.
 *
 * **`&` is replaced first, and that ordering is load-bearing.** Every other
 * replacement emits an entity beginning with `&`; running the `&` pass after them
 * would rewrite the ampersands this function just produced and turn `&lt;` into
 * `&amp;lt;`, which renders as the literal text "&lt;". Sequential passes are used
 * rather than one regex with a lookup table so that no branch here is unreachable:
 * a lookup needs a fallback for a key the regex can never produce, and an
 * untestable branch is worse than four extra passes over a string this short.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
