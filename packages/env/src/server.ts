/**
 * Server-only environment surface.
 *
 * The `server-only` import is the credential firewall: any client component that
 * reaches this module fails the Next.js build with a clear error, rather than
 * silently shipping a secret in the browser bundle.
 */

// Side-effect import: throws under the client export condition. See server-only.test.ts.
// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export {
  createEnv,
  type CreateEnvOptions,
  type EnvOf,
  type InferPresets,
  type RuntimeEnv,
  type RuntimeEnvFor,
} from "./create-env.ts";
export { definePreset } from "./merge-presets.ts";
export { auth } from "./presets/auth.ts";
export { base, logLevels } from "./presets/base.ts";
export { db } from "./presets/db.ts";
export { featureFlags } from "./presets/flags.ts";
export { otel } from "./presets/otel.ts";
export { posthog, posthogClient } from "./presets/posthog.ts";
export { publicApp, stripeClient } from "./presets/public.ts";
export { redis } from "./presets/redis.ts";
export { resend } from "./presets/resend.ts";
export { s3 } from "./presets/s3.ts";
export { smtp } from "./presets/smtp.ts";
export { appEnvs, nodeEnvs, shared, type AppEnv, type NodeEnv } from "./presets/shared.ts";
export { stripe } from "./presets/stripe.ts";
