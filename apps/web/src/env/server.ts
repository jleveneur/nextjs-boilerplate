// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

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
  s3,
  sentry,
  smtp,
  stripe,
} from "@repo/env/server";

import { webClientPresets, webClientRuntimeEnv } from "./browser.ts";

/**
 * Server edge env for `apps/web`.
 *
 * Validated once at import. Client code must import `./client.ts` — never this file.
 * `PORTLESS_URL` is the public origin when `make dev` wraps the process; `.env`
 * remains the fallback for `PORTLESS=0` and for non-dev entrypoints.
 */
export const env = createEnv({
  server: [base, db, redis, auth, resend, smtp, s3, otel, sentry, posthog, featureFlags, stripe],
  client: webClientPresets,
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    APP_ENV: process.env["APP_ENV"],
    APP_URL: process.env["PORTLESS_URL"] ?? process.env["APP_URL"],
    LOG_LEVEL: process.env["LOG_LEVEL"],
    DATABASE_URL: process.env["DATABASE_URL"],
    DATABASE_POOL_SIZE: process.env["DATABASE_POOL_SIZE"],
    REDIS_URL: process.env["REDIS_URL"],
    BETTER_AUTH_SECRET: process.env["BETTER_AUTH_SECRET"],
    BETTER_AUTH_URL: process.env["PORTLESS_URL"] ?? process.env["BETTER_AUTH_URL"],
    GITHUB_CLIENT_ID: process.env["GITHUB_CLIENT_ID"],
    GITHUB_CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"],
    GOOGLE_CLIENT_ID: process.env["GOOGLE_CLIENT_ID"],
    GOOGLE_CLIENT_SECRET: process.env["GOOGLE_CLIENT_SECRET"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    EMAIL_FROM: process.env["EMAIL_FROM"],
    SMTP_URL: process.env["SMTP_URL"],
    MAILPIT_API_URL: process.env["MAILPIT_API_URL"],
    S3_ENDPOINT: process.env["S3_ENDPOINT"],
    S3_REGION: process.env["S3_REGION"],
    S3_BUCKET: process.env["S3_BUCKET"],
    S3_ACCESS_KEY_ID: process.env["S3_ACCESS_KEY_ID"],
    S3_SECRET_ACCESS_KEY: process.env["S3_SECRET_ACCESS_KEY"],
    OTEL_ENABLED: process.env["OTEL_ENABLED"],
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
    OTEL_SERVICE_NAME: process.env["OTEL_SERVICE_NAME"],
    SENTRY_ENABLED: process.env["SENTRY_ENABLED"],
    SENTRY_DSN: process.env["SENTRY_DSN"] ?? process.env["NEXT_PUBLIC_SENTRY_DSN"],
    SENTRY_ENVIRONMENT: process.env["SENTRY_ENVIRONMENT"],
    SENTRY_RELEASE: process.env["SENTRY_RELEASE"],
    POSTHOG_API_KEY: process.env["POSTHOG_API_KEY"],
    POSTHOG_HOST: process.env["POSTHOG_HOST"],
    FLAGS_JSON: process.env["FLAGS_JSON"],
    STRIPE_SECRET_KEY: process.env["STRIPE_SECRET_KEY"],
    STRIPE_WEBHOOK_SECRET: process.env["STRIPE_WEBHOOK_SECRET"],
    ...webClientRuntimeEnv,
  },
});
