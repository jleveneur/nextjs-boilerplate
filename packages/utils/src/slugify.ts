/**
 * Human-readable, machine-safe string fragments.
 *
 * Used where a name has to appear in something a machine parses — the trailing
 * segment of a storage key, a URL path. The output is not an identifier and must
 * never be treated as one: slugs collide, so anything addressing a single record
 * pairs the slug with a uuid.
 */

// Non-English names and the mangled output they produce without the folding below.
// Scoped to this file rather than added to the project dictionary: "sren" and
// "stra" are examples of a bug, not words.
// cspell:ignore Søren sren Straße stra Brûlée brulee creme

/** Characters kept as-is. Everything else becomes a separator or is dropped. */
const KEPT = /[a-z0-9]+/g;

/** Combining marks, which NFKD separates out of accented characters. */
const COMBINING_MARKS = /\p{M}+/gu;

/**
 * Latin letters with no NFKD decomposition.
 *
 * Normalisation splits `é` into `e` plus an accent, but these are not accented
 * letters — they are distinct letters, so decomposition leaves them untouched and
 * they are then dropped as non-ASCII. Without this table a Danish `ø` or a German
 * `ß` silently disappears: `Søren` slugs to `sren` and `Straße` to `stra-e`.
 *
 * Deliberately short. It covers the letters that appear in European names and
 * product copy, which is where the damage is, and stops well short of being a
 * transliteration library.
 */
const NON_DECOMPOSING: ReadonlyMap<string, string> = new Map([
  ["æ", "ae"],
  ["ø", "o"],
  ["œ", "oe"],
  ["ß", "ss"],
  ["ð", "d"],
  ["đ", "d"],
  ["þ", "th"],
  ["ł", "l"],
  ["ı", "i"],
  ["ħ", "h"],
  ["ŋ", "ng"],
]);

/**
 * Converts `value` to a lowercase, hyphen-separated ASCII slug.
 *
 * ```ts
 * slugify("Q3 Financial Report (final).pdf"); // "q3-financial-report-final-pdf"
 * slugify("Crème Brûlée");                    // "creme-brulee"
 * ```
 *
 * Accented Latin characters fold to their base letter, so `é` becomes `e` rather
 * than disappearing. Scripts with no ASCII equivalent — Chinese, Arabic, Hebrew,
 * emoji — have none to fold to and are dropped, so this **returns an empty string**
 * for input written entirely in them. That is not a rare edge case in a product
 * with international users, and a caller that interpolates the result without
 * checking will build a key ending in a stray separator. Check for empty and
 * substitute something meaningful.
 */
export function slugify(value: string): string {
  const lowered = value.toLowerCase();

  // Substitute the letters normalisation cannot decompose, before normalising.
  // Iterated by code point, so characters outside the BMP are not split into
  // surrogate halves.
  let substituted = "";
  for (const character of lowered) {
    substituted += NON_DECOMPOSING.get(character) ?? character;
  }

  // NFKD splits an accented character into its base letter plus a combining mark.
  // The mark then has to be removed rather than merely left unmatched: it sits
  // between the base letter and the rest of the word, so a run-matching pass reads
  // it as a boundary and "Crème" becomes "cre-me" instead of "creme".
  const folded = substituted.normalize("NFKD").replaceAll(COMBINING_MARKS, "");

  return [...(folded.match(KEPT) ?? [])].join("-");
}
