import { createEnv, publicApp } from "@repo/env/client";

/**
 * Browser-safe env. Only `NEXT_PUBLIC_*` keys.
 *
 * Member access (not brackets) is required so Next can inline these at build time.
 */
export const env = createEnv({
  client: [publicApp],
  runtimeEnv: {
    // @ts-expect-error Next inlines only static `.NEXT_PUBLIC_*` member access
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    // @ts-expect-error Next inlines only static `.NEXT_PUBLIC_*` member access
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  },
});
