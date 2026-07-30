/**
 * Composition-root entry for tracing and error reporting.
 *
 * Both backends are off by default so local and CI stay quiet. Wire
 * {@link getTraceContext} into `createLogger` at the same call site.
 */

import { initOtel } from "./init-otel.ts";
import { initSentry } from "./init-sentry.ts";
import type { InitObservabilityOptions, ObservabilityHandle } from "./types.ts";

export function initObservability(options: InitObservabilityOptions): ObservabilityHandle {
  const otel = initOtel(options.serviceName, options.otel);
  const sentry = initSentry(options.sentry);

  return {
    async shutdown() {
      await Promise.all([otel.shutdown(), sentry.shutdown()]);
    },
  };
}
