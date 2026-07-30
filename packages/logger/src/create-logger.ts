/**
 * Pino logger factory.
 *
 * Writes structured JSON to stdout. Trace ids come from an injected callback so
 * this package never depends on `@repo/observability` (same-layer ban).
 */

import { pino } from "pino";

import { REDACT_PATHS } from "./redact.ts";
import type { CreateLoggerOptions, Logger } from "./types.ts";

export function createLogger(options: CreateLoggerOptions): Logger {
  const getTraceContext = options.getTraceContext;
  const config = {
    level: options.level ?? "info",
    base: {
      service: options.service,
      env: options.env,
      ...(options.version === undefined ? {} : { version: options.version }),
    },
    redact: {
      paths: [...REDACT_PATHS],
      censor: "[Redacted]",
    },
    mixin() {
      if (getTraceContext === undefined) {
        return {};
      }

      const { traceId, spanId } = getTraceContext();
      return {
        ...(traceId === undefined ? {} : { traceId }),
        ...(spanId === undefined ? {} : { spanId }),
      };
    },
    // Prefer the object form: `log.info({ invoiceId }, "voided")`.
    // Message keys stay `msg` so aggregators can index them uniformly.
    messageKey: "msg",
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (options.destination === undefined) {
    return pino(config);
  }

  return pino(config, options.destination);
}
