/**
 * Composition-root entry for tracing.
 *
 * OTel is off by default so local and CI stay quiet. Wire
 * {@link getTraceContext} into `createLogger` at the same call site.
 */

import { initOtel } from "./init-otel.ts";
import type { InitObservabilityOptions, ObservabilityHandle } from "./types.ts";

export function initObservability(options: InitObservabilityOptions): ObservabilityHandle {
  const otel = initOtel(options.serviceName, options.otel);

  return {
    async shutdown() {
      await otel.shutdown();
    },
  };
}
