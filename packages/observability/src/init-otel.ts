/**
 * OpenTelemetry Node SDK bootstrap (OTLP HTTP traces + metrics).
 */

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
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
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
    ],
  });

  sdk.start();

  return {
    async shutdown() {
      await sdk.shutdown();
    },
  };
}
