/**
 * W3C trace context headers for outbound fetch from a Node process.
 *
 * Browser → web oRPC stays in-process on Next.js; HTTP auto-instrumentation
 * creates the server span on arrival. Use these headers for server-side calls
 * to other services (e.g. REST to `apps/api`).
 */

import { context, propagation } from "@opentelemetry/api";

/** Returns W3C `traceparent` / `tracestate` headers from the active span. */
export function getPropagationHeaders(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}
