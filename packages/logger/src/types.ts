import type { DestinationStream, Logger as PinoLogger } from "pino";

/** Public logger surface — Pino's logger, narrowed to what we want callers to use. */
export type Logger = PinoLogger;

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export type TraceContext = {
  traceId?: string;
  spanId?: string;
};

export type CreateLoggerOptions = {
  /** Deployable unit name: `web`, `api`, `worker`, … */
  service: string;
  level?: LogLevel;
  /** `APP_ENV` value — `local`, `staging`, `production`, … */
  env: string;
  /** Build metadata, typically a git SHA. */
  version?: string;
  /**
   * Optional trace correlator. Injected from `@repo/observability` at the
   * composition root — this package must not import observability (same layer).
   */
  getTraceContext?: () => TraceContext;
  /**
   * Override the destination (tests pass a collecting stream). Defaults to
   * stdout.
   */
  destination?: DestinationStream;
};
