import { z } from "zod";

/**
 * Error tracking. Server-side only — there is no browser DSN.
 *
 * The DSN is the entire switch: absent selects the no-op tracker, which is the
 * supported state for local runs, CI, and self-hosted deployments without one.
 * An earlier version paired it with `SENTRY_ENABLED`, which is two ways to say
 * the same thing and one of them to get wrong.
 *
 * The environment comes from `APP_ENV` and the release from the git SHA, so
 * neither needs its own variable.
 *
 * A self-hosted GlitchTip DSN works here unchanged — same protocol.
 */
export const sentry = z.object({
  SENTRY_DSN: z.url().optional(),
});
