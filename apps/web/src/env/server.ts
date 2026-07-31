// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import { auth, base, createEnv, db, publicApp, redis, resend, smtp } from "@repo/env/server";

/**
 * Server edge env for `apps/web`.
 *
 * Validated once at import. Client code must import `./client.ts` — never this file.
 */
export const env = createEnv({
  server: [base, db, redis, auth, resend, smtp],
  client: [publicApp],
  skipValidation:
    process.env["SKIP_ENV_VALIDATION"] === "1" || process.env["SKIP_ENV_VALIDATION"] === "true",
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    APP_ENV: process.env["APP_ENV"],
    APP_URL: process.env["APP_URL"],
    LOG_LEVEL: process.env["LOG_LEVEL"],
    DATABASE_URL: process.env["DATABASE_URL"],
    DATABASE_POOL_SIZE: process.env["DATABASE_POOL_SIZE"],
    REDIS_URL: process.env["REDIS_URL"],
    BETTER_AUTH_SECRET: process.env["BETTER_AUTH_SECRET"],
    BETTER_AUTH_URL: process.env["BETTER_AUTH_URL"],
    GITHUB_CLIENT_ID: process.env["GITHUB_CLIENT_ID"],
    GITHUB_CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"],
    GOOGLE_CLIENT_ID: process.env["GOOGLE_CLIENT_ID"],
    GOOGLE_CLIENT_SECRET: process.env["GOOGLE_CLIENT_SECRET"],
    TRIGGER_ENABLED: process.env["TRIGGER_ENABLED"],
    TRIGGER_SECRET_KEY: process.env["TRIGGER_SECRET_KEY"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    EMAIL_FROM: process.env["EMAIL_FROM"],
    SMTP_URL: process.env["SMTP_URL"],
    MAILPIT_API_URL: process.env["MAILPIT_API_URL"],
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
    NEXT_PUBLIC_APP_ENV: process.env["NEXT_PUBLIC_APP_ENV"],
    SKIP_ENV_VALIDATION: process.env["SKIP_ENV_VALIDATION"],
  },
});
