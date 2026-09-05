import {
  auth,
  base,
  createEnv,
  db,
  featureFlags,
  otel,
  posthog,
  redis,
  resend,
  sentry,
  smtp,
  stripe,
} from "@repo/env/server";
import { z } from "zod";

const api = z.object({
  API_PORT: z.coerce.number().int().positive().default(3001),
});

/**
 * Server env for `apps/api`.
 *
 * Validated once at import. This is a Node composition root — no client presets.
 */
export const env = createEnv({
  server: [base, db, redis, auth, resend, smtp, otel, sentry, posthog, featureFlags, stripe, api],
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
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    EMAIL_FROM: process.env["EMAIL_FROM"],
    SMTP_URL: process.env["SMTP_URL"],
    MAILPIT_API_URL: process.env["MAILPIT_API_URL"],
    OTEL_ENABLED: process.env["OTEL_ENABLED"],
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
    OTEL_SERVICE_NAME: process.env["OTEL_SERVICE_NAME"],
    SENTRY_ENABLED: process.env["SENTRY_ENABLED"],
    SENTRY_DSN: process.env["SENTRY_DSN"],
    SENTRY_ENVIRONMENT: process.env["SENTRY_ENVIRONMENT"],
    SENTRY_RELEASE: process.env["SENTRY_RELEASE"],
    POSTHOG_API_KEY: process.env["POSTHOG_API_KEY"],
    POSTHOG_HOST: process.env["POSTHOG_HOST"],
    FLAGS_JSON: process.env["FLAGS_JSON"],
    API_PORT: process.env["API_PORT"],
    STRIPE_SECRET_KEY: process.env["STRIPE_SECRET_KEY"],
    STRIPE_WEBHOOK_SECRET: process.env["STRIPE_WEBHOOK_SECRET"],
  },
});
