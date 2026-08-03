import { z } from "zod";

import { appEnvs } from "./shared.ts";

/**
 * Public values inlined into the client bundle.
 *
 * Kept deliberately small so one image can be promoted from staging to
 * production: only the app origin and the environment name. Analytics and
 * error-tracking public keys live in their own client presets.
 */
export const publicApp = z.object({
  NEXT_PUBLIC_APP_URL: z.url().refine((value) => !value.endsWith("/"), {
    message: "must not have a trailing slash",
  }),
  NEXT_PUBLIC_APP_ENV: z.enum(appEnvs),
});

/** Optional Stripe publishable key for client Checkout / Elements (Phase 17). */
export const stripeClient = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z
      .string()
      .min(1)
      .refine((value) => value.startsWith("pk_"), { message: "must start with pk_" })
      .optional(),
  ),
});
