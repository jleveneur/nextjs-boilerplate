/**
 * Read the active OpenTelemetry span for logger correlation.
 *
 * Safe when OTel was never started — returns an empty object.
 */

import { trace, type SpanContext } from "@opentelemetry/api";

import type { TraceContext } from "./types.ts";

export function spanContextToTraceContext(spanContext: SpanContext): TraceContext {
  if (!trace.isSpanContextValid(spanContext)) {
    return {};
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

export function getTraceContext(): TraceContext {
  const span = trace.getActiveSpan();
  if (span === undefined) {
    return {};
  }

  return spanContextToTraceContext(span.spanContext());
}
