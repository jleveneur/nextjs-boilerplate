import { createEnv, posthogClient, publicApp, sentryClient } from "@repo/env/client";

/**
 * Browser-safe env. Only `NEXT_PUBLIC_*` keys.
 *
 * Member access (not brackets) is required so Next can inline these at build time.
 */
export const env = createEnv({
  client: [publicApp, posthogClient, sentryClient],
  runtimeEnv: {
    // @ts-expect-error Next inlines only static `.NEXT_PUBLIC_*` member access
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    // @ts-expect-error Next inlines only static `.NEXT_PUBLIC_*` member access
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    // @ts-expect-error Next inlines only static `.NEXT_PUBLIC_*` member access
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    // @ts-expect-error Next inlines only static `.NEXT_PUBLIC_*` member access
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // @ts-expect-error Next inlines only static `.NEXT_PUBLIC_*` member access
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
});
