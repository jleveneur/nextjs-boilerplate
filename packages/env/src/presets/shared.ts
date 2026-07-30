/**
 * Variables present and identical on server and client.
 *
 * `APP_ENV` distinguishes local / test / preview / staging / production.
 * `NODE_ENV` is only ever the three values frameworks understand — overloading
 * it with a fourth breaks optimisations in subtle ways.
 */

import { z } from "zod";

/** The five deployable environments. See docs/architecture/09 §3. */
export const appEnvs = ["local", "test", "preview", "staging", "production"] as const;
export type AppEnv = (typeof appEnvs)[number];

export const nodeEnvs = ["development", "test", "production"] as const;
export type NodeEnv = (typeof nodeEnvs)[number];

/**
 * Shared by every app. Compose into `server` and, where the values are also
 * public, mirror the public subset through a client preset.
 */
export const shared = z.object({
  NODE_ENV: z.enum(nodeEnvs),
  APP_ENV: z.enum(appEnvs),
  /**
   * Canonical origin of the deployment, with no trailing slash.
   * Used for absolute URLs in emails, redirects, and OpenAPI servers.
   */
  APP_URL: z.url().refine((value) => !value.endsWith("/"), {
    message: "must not have a trailing slash",
  }),
});
