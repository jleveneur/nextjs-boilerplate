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
  combine,
  createEnv,
  type CreateEnvOptions,
  type EnvOf,
  type InferPresets,
  type RuntimeEnv,
} from "./create-env.ts";
export {
  auth,
  base,
  db,
  featureFlags,
  logLevels,
  otel,
  posthog,
  posthogClient,
  publicApp,
  redis,
  resend,
  s3,
  sentry,
  sentryClient,
  smtp,
  shared,
  stripe,
  stripeClient,
  appEnvs,
  nodeEnvs,
  type AppEnv,
  type NodeEnv,
} from "./presets/index.ts";
