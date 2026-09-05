// Side-effect: augments NodeJS.ProcessEnv with NEXT_PUBLIC_* keys so Next's
// required static member access type-checks under noPropertyAccessFromIndexSignature.
// oxlint-disable-next-line import/no-unassigned-import
import "./process-env.d.ts";

/**
 * Client-safe environment surface.
 *
 * Only `NEXT_PUBLIC_*` presets are re-exported here. Importing `@repo/env/server`
 * from a client component fails the build; importing this module cannot pull a
 * secret into the bundle by accident.
 */

export {
  createEnv,
  type CreateEnvOptions,
  type EnvOf,
  type InferPresets,
  type RuntimeEnv,
  type RuntimeEnvFor,
} from "./create-env.ts";
export { posthogClient } from "./presets/posthog.ts";
export { publicApp, stripeClient } from "./presets/public.ts";
export { sentryClient } from "./presets/sentry.ts";
export { appEnvs, type AppEnv } from "./presets/shared.ts";
