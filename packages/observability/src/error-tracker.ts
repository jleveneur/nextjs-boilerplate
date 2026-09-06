/**
 * Error tracking port.
 *
 * Logs answer "what happened in this request". A tracker answers "what is
 * broken this week" — it groups the same exception across requests, releases and
 * hosts, which no log query does well.
 *
 * It deliberately does **not** live in `CtxPorts`. The domain raises typed
 * errors; deciding that one is an incident is a boundary decision, made in the
 * three places that already call `logger.error`. Handing the domain a tracker
 * would invite services to report their own failures, and then every wrapped
 * rethrow becomes a duplicate event.
 */

export type ErrorTrackerContext = {
  /** Correlates the event with the log lines and the trace for one request. */
  requestId?: string;
  userId?: string;
  organizationId?: string;
  /** Stable `AppError` code, so grouping survives a message reword. */
  code?: string;
  /** Route, job name, or whatever names the boundary that caught this. */
  operation?: string;
};

export type ErrorTracker = {
  /**
   * Report an unexpected error. Never throws and never blocks the response —
   * a tracker outage must not become an outage.
   */
  capture(error: unknown, context?: ErrorTrackerContext): void;
  /** Drain in-flight events before the process exits. */
  flush(timeoutMs?: number): Promise<void>;
};

/**
 * The default. An unset DSN is a supported state, not a degraded one: local
 * runs, tests, and self-hosted deployments without a tracker all take this path.
 */
export function createNoopErrorTracker(): ErrorTracker {
  return {
    capture() {
      // Intentionally nothing. The boundary has already logged the error.
    },
    flush() {
      return Promise.resolve();
    },
  };
}
