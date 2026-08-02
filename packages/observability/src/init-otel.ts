/**
 * OpenTelemetry Node SDK bootstrap (OTLP HTTP traces + metrics).
 *
 * Explicit instrumentations only — the auto-instrumentations meta-package
 * pulls Mongo/AWS/Kafka/etc. into the api/worker bundles for no gain here.
 */

import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

import type { OtelInitOptions } from "./types.ts";

export type OtelHandle = {
  shutdown(): Promise<void>;
};

export function initOtel(serviceName: string, options: OtelInitOptions): OtelHandle {
  if (!options.enabled) {
    return { shutdown: () => Promise.resolve() };
  }

  if (options.endpoint === undefined || options.endpoint === "") {
    throw new Error("OTEL_EXPORTER_OTLP_ENDPOINT is required when OTEL_ENABLED=true");
  }

  const endpoint = options.endpoint.replace(/\/$/, "");
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    ...(options.version === undefined ? {} : { [ATTR_SERVICE_VERSION]: options.version }),
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${endpoint}/v1/metrics`,
      }),
      exportIntervalMillis: 15_000,
    }),
    instrumentations: [
      // Inbound HTTP (api) and Node's http/https clients.
      new HttpInstrumentation(),
      // Global fetch / undici (outbound calls from api + worker).
      new UndiciInstrumentation(),
      // Redis via ioredis (@repo/cache, BullMQ).
      new IORedisInstrumentation(),
      // Event-loop / runtime metrics for Grafana RED panels.
      new RuntimeNodeInstrumentation(),
    ],
  });

  sdk.start();

  return {
    async shutdown() {
      await sdk.shutdown();
    },
  };
}
