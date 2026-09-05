/**
 * Coercion helpers for environment strings.
 *
 * Everything arriving from `process.env` is a string. These exist so presets do
 * not reinvent `Boolean("false") === true`, which is the bug that ships silently
 * the first time someone sets a flag to `"false"` and watches it stay on.
 */

import { z } from "zod";

/**
 * `"true"` / `"false"` → boolean.
 *
 * Rejects anything else — including `"1"` and `"yes"` — so a typo is a boot
 * failure rather than a surprising default. Empty strings are stripped before
 * this runs, so a defaulted flag treats `""` as unset.
 */
export const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

/**
 * Port or pool size: digits only, coerced to a positive integer.
 *
 * `z.coerce.number()` alone accepts `"3.14"` and `"1e2"`; ports are integers.
 */
export const portNumber = z.coerce.number().int().positive().max(65_535);

/** Positive integer with no upper bound — pool sizes, timeouts in milliseconds. */
export const positiveInt = z.coerce.number().int().positive();

/**
 * Converts `""` to `undefined` across a picked `runtimeEnv` map.
 *
 * Shells and `.env` loaders often set a variable to the empty string rather than
 * leaving it unset. `createEnv` runs this before parse so presets do not each
 * reimplement the same preprocess.
 */
export function emptyStringsToUndefined(
  source: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = value === "" ? undefined : value;
  }
  return out;
}

/** Optional URL. Empty strings are stripped by {@link emptyStringsToUndefined}. */
export const optionalUrl = z.url().optional();
