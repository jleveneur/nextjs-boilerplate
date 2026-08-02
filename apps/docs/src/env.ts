import { createEnv, publicApp } from "@repo/env/client";

/**
 * Docs site only needs public bake-time values — no secrets, DB, or Redis.
 */
export const env = createEnv({
  client: [publicApp],
  skipValidation:
    process.env["SKIP_ENV_VALIDATION"] === "1" || process.env["SKIP_ENV_VALIDATION"] === "true",
  runtimeEnv: {
    // @ts-expect-error Next inlines only static `.NEXT_PUBLIC_*` member access
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    // @ts-expect-error Next inlines only static `.NEXT_PUBLIC_*` member access
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  },
});
