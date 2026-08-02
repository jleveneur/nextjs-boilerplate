/**
 * Boot OpenTelemetry + Sentry for the worker process.
 * Must be imported before other app modules that open sockets (ioredis, pg, BullMQ).
 */

import { initObservability, type ObservabilityHandle } from "@repo/observability";

import { env } from "./env.ts";

const release = env.SENTRY_RELEASE ?? process.env["GITHUB_SHA"];

export const observability: ObservabilityHandle = initObservability({
  serviceName: env.OTEL_SERVICE_NAME === "app" ? "worker" : env.OTEL_SERVICE_NAME,
  otel: {
    enabled: env.OTEL_ENABLED,
    ...(env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined
      ? { endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT }
      : {}),
    ...(release !== undefined ? { version: release } : {}),
  },
  sentry: {
    enabled: env.SENTRY_ENABLED,
    ...(env.SENTRY_DSN !== undefined ? { dsn: env.SENTRY_DSN } : {}),
    environment: env.SENTRY_ENVIRONMENT ?? env.APP_ENV,
    ...(release !== undefined ? { release } : {}),
  },
});
