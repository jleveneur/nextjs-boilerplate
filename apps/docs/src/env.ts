import { createEnv, publicApp } from "@repo/env/client";

/**
 * Docs site only needs public bake-time values — no secrets, DB, or Redis.
 */
export const env = createEnv({
  client: [publicApp],
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  },
});
