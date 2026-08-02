/**
 * Analytics sink port. Implementations must not throw on capture failure in a
 * way that breaks the request — callers treat analytics as fire-and-forget.
 *
 * Call {@link AnalyticsSink.flush}/{@link AnalyticsSink.shutdown} on process
 * exit so buffered server-side captures are not dropped.
 */

export type AnalyticsSink = {
  capture(event: string, properties?: Record<string, unknown>): Promise<void>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
};
