import { auth, base, createEnv, db, redis, resend, smtp } from "@repo/env/server";
import { z } from "zod";

const api = z.object({
  API_PORT: z.coerce.number().int().positive().default(3001),
  /** Optional until Phase 17; webhook skeleton verifies only when set. */
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

/**
 * Server env for `apps/api`.
 *
 * Validated once at import. This is a Node composition root — no client presets.
 */
export const env = createEnv({
  server: [base, db, redis, auth, resend, smtp, api],
  skipValidation:
    process.env["SKIP_ENV_VALIDATION"] === "1" || process.env["SKIP_ENV_VALIDATION"] === "true",
  runtimeEnv: {
    NODE_ENV: process.env["NODE_ENV"],
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
    API_PORT: process.env["API_PORT"],
    STRIPE_WEBHOOK_SECRET: process.env["STRIPE_WEBHOOK_SECRET"],
    SKIP_ENV_VALIDATION: process.env["SKIP_ENV_VALIDATION"],
  },
});
