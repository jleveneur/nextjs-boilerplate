/**
 * Merges an array of Zod object schemas into one.
 *
 * Presets are composed by apps (`createEnv({ server: [base, db, redis] })`), so
 * the merge has to preserve each field's validators and produce a single object
 * schema Zod can parse against. Later presets win on key collision — deliberate,
 * so an app can override a default by appending a small schema.
 */

import { z, type ZodObject, type ZodRawShape } from "zod";

export type Preset = ZodObject<ZodRawShape>;

/**
 * Flattens `presets` into one object schema.
 *
 * Accepts a single preset or an array, so call sites can write either
 * `server: db` or `server: [base, db]` without ceremony.
 */
export function mergePresets(presets: Preset | readonly Preset[] | undefined): Preset {
  if (presets === undefined) return z.object({});

  const list = Array.isArray(presets) ? presets : [presets];
  const shape: ZodRawShape = {};

  for (const preset of list) {
    // Zod 4 types `ZodObject<ZodRawShape>.shape` as `any`. The runtime value is a
    // field map; assigning it is how preset composition works.
    // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
    const fields: ZodRawShape = preset.shape;
    Object.assign(shape, fields);
  }

  return z.object(shape);
}
