export type TraceContext = {
  traceId?: string;
  spanId?: string;
};

export type OtelInitOptions = {
  enabled: boolean;
  /** OTLP HTTP base URL, e.g. `http://127.0.0.1:4318`. Required when enabled. */
  endpoint?: string;
  /** Service version / release — typically a git SHA. */
  version?: string;
};

export type SentryInitOptions = {
  enabled: boolean;
  dsn?: string;
  environment?: string;
  /** Release tag — typically a git SHA. */
  release?: string;
  /** Align with OTel sampling; default 0 (errors only via captureException). */
  tracesSampleRate?: number;
};

export type InitObservabilityOptions = {
  serviceName: string;
  otel: OtelInitOptions;
  sentry: SentryInitOptions;
};

export type ObservabilityHandle = {
  /** Flush exporters and close SDKs. Safe to call when init was a no-op. */
  shutdown(): Promise<void>;
};
