/**
 * Boot OpenTelemetry for the API process.
 * Must be imported before other app modules that open sockets.
 */

import { initObservability, type ObservabilityHandle } from "@repo/observability";

import { env } from "./env.ts";

const release = process.env["GITHUB_SHA"];

export const observability: ObservabilityHandle = initObservability({
  serviceName: env.OTEL_SERVICE_NAME === "app" ? "api" : env.OTEL_SERVICE_NAME,
  otel: {
    enabled: env.OTEL_ENABLED,
    ...(env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined
      ? { endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT }
      : {}),
    ...(release !== undefined ? { version: release } : {}),
  },
});
