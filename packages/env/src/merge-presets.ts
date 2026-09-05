/**
 * Merges an array of Zod object schemas into one.
 *
 * Presets are composed by apps (`createEnv({ server: [base, db, redis] })`), so
 * the merge has to preserve each field's validators and produce a single object
 * schema Zod can parse against. Later presets win on key collision — deliberate,
 * so an app can override a default by appending a small schema.
 *
 * Object-level `.refine()` does not survive a shape merge. Pairing rules live on
 * the preset via {@link definePreset} and run against the parsed result.
 */

import { z, type ZodObject, type ZodRawShape } from "zod";

export type Preset = ZodObject<ZodRawShape>;

export type PresetProblems = (env: Readonly<Record<string, unknown>>) => readonly string[];

const PRESET_PROBLEMS = Symbol("presetProblems");

type PresetWithProblems = Preset & {
  readonly [PRESET_PROBLEMS]?: PresetProblems;
};

/**
 * Attaches cross-field checks to a Zod object schema.
 *
 * The schema stays a `ZodObject` (so `.shape` still spreads). `createEnv` runs
 * every attached function after a successful parse, and only for presets the
 * app actually composed.
 */
export function definePreset<T extends Preset>(schema: T, problems: PresetProblems): T {
  Object.defineProperty(schema, PRESET_PROBLEMS, {
    value: problems,
    enumerable: false,
    configurable: true,
  });
  return schema;
}

export function asPresetList(presets: Preset | readonly Preset[] | undefined): readonly Preset[] {
  if (presets === undefined) {
    return [];
  }
  if (isPresetArray(presets)) {
    return presets;
  }
  return [presets];
}

function isPresetArray(value: Preset | readonly Preset[]): value is readonly Preset[] {
  return Array.isArray(value);
}

export function collectPresetProblems(
  presets: Preset | readonly Preset[] | undefined,
): readonly PresetProblems[] {
  const fns: PresetProblems[] = [];
  for (const preset of asPresetList(presets)) {
    const problems = problemsOf(preset);
    if (problems !== undefined) fns.push(problems);
  }
  return fns;
}

/**
 * Flattens `presets` into one object schema.
 *
 * Accepts a single preset or an array, so call sites can write either
 * `server: db` or `server: [base, db]` without ceremony.
 */
export function mergePresets(presets: Preset | readonly Preset[] | undefined): Preset {
  const list = asPresetList(presets);
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

function problemsOf(preset: Preset): PresetProblems | undefined {
  const problems = (preset as PresetWithProblems)[PRESET_PROBLEMS];
  return typeof problems === "function" ? problems : undefined;
}
