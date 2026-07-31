import { createEnv } from "@repo/env/shared";
import { base, db, redis, resend, s3, smtp } from "@repo/env/presets";
import { z } from "zod";

const worker = z.object({
  WORKER_PORT: z.coerce.number().int().positive().default(3002),
  /** Outbox poll interval in milliseconds. */
  OUTBOX_POLL_MS: z.coerce.number().int().positive().default(1000),
});

/**
 * Server env for `apps/worker`.
 *
 * Composed from `@repo/env/presets` (no `server-only`) so the Node worker
 * process is not tied to the Next.js client firewall.
 */
export const env = createEnv({
  server: [base, db, redis, s3, resend, smtp, worker],
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
    S3_ENDPOINT: process.env["S3_ENDPOINT"],
    S3_REGION: process.env["S3_REGION"],
    S3_BUCKET: process.env["S3_BUCKET"],
    S3_ACCESS_KEY_ID: process.env["S3_ACCESS_KEY_ID"],
    S3_SECRET_ACCESS_KEY: process.env["S3_SECRET_ACCESS_KEY"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    EMAIL_FROM: process.env["EMAIL_FROM"],
    SMTP_URL: process.env["SMTP_URL"],
    MAILPIT_API_URL: process.env["MAILPIT_API_URL"],
    WORKER_PORT: process.env["WORKER_PORT"],
    OUTBOX_POLL_MS: process.env["OUTBOX_POLL_MS"],
    SKIP_ENV_VALIDATION: process.env["SKIP_ENV_VALIDATION"],
  },
});
