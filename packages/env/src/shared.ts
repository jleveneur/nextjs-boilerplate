/**
 * Shared environment vocabulary.
 *
 * Safe to import from server and client code. Does not read `process.env` and
 * does not export secrets — only the schemas and helpers both sides share.
 */

export { booleanString, optionalUrl, portNumber, positiveInt } from "./coerce.ts";
export {
  createEnv,
  type CreateEnvOptions,
  type EnvOf,
  type InferPresets,
  type RuntimeEnv,
  type RuntimeEnvFor,
} from "./create-env.ts";
export { formatEnvErrors } from "./format-errors.ts";
export { definePreset, type Preset } from "./merge-presets.ts";
export { appEnvs, nodeEnvs, shared, type AppEnv, type NodeEnv } from "./presets/shared.ts";
