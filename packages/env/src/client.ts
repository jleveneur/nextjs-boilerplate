/**
 * Client-safe environment surface.
 *
 * Only `NEXT_PUBLIC_*` presets are re-exported here. Importing `@repo/env/server`
 * from a client component fails the build; importing this module cannot pull a
 * secret into the bundle by accident.
 */

export {
  combine,
  createEnv,
  type CreateEnvOptions,
  type EnvOf,
  type InferPresets,
  type RuntimeEnv,
} from "./create-env.ts";
export { posthogClient } from "./presets/posthog.ts";
export { publicApp } from "./presets/public.ts";
export { sentryClient } from "./presets/sentry.ts";
export { appEnvs, type AppEnv } from "./presets/shared.ts";
