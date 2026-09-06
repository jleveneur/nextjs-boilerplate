import type { TraceContext } from "../types.ts";

/** Fixed trace context for unit tests that wire a logger mixin. */
export function createFixedTraceContext(context: TraceContext): () => TraceContext {
  return () => context;
}

/** Always-empty correlator — same shape as “OTel not started”. */
export function noopGetTraceContext(): TraceContext {
  return {};
}
