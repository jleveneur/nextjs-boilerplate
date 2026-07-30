/**
 * OpenTelemetry Node SDK bootstrap (OTLP HTTP traces).
 */

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

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
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
    }),
  });

  sdk.start();

  return {
    async shutdown() {
      await sdk.shutdown();
    },
  };
}
