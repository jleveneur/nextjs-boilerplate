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
 * Rejects anything else — including `"1"`, `"yes"`, and `""` — so a typo is a
 * boot failure rather than a surprising default.
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
 * Treats `""` as absent.
 *
 * Shells and `.env` loaders often set a variable to the empty string rather than
 * leaving it unset; without this, `z.url().optional()` rejects `""` as an
 * invalid URL instead of accepting "not provided".
 */
export function emptyToUndefined(value: unknown): unknown {
  return value === "" ? undefined : value;
}

/** Optional URL that tolerates an empty string from the environment. */
export const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
