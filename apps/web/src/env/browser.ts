import { posthogClient, publicApp, sentryClient, stripeClient } from "@repo/env/client";

/**
 * Public web env shared by the browser module and the server composition root
 * so the two `createEnv` calls cannot drift.
 *
 * Member access (not brackets) is required so Next can inline these at build time.
 */
export const webClientPresets = [publicApp, posthogClient, sentryClient, stripeClient] as const;

export const webClientRuntimeEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};
