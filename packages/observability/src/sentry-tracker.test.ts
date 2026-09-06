import { trace } from "@opentelemetry/api";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSentryErrorTracker } from "./sentry-tracker.ts";

const init = vi.fn<(options: unknown) => void>();
const captureException = vi.fn<(error: unknown) => void>();
const flush = vi.fn<(timeout?: number) => Promise<boolean>>(() => Promise.resolve(true));
const setTag = vi.fn<(key: string, value: unknown) => void>();

vi.mock("@sentry/node", () => ({
  init: (options: unknown) => init(options),
  captureException: (error: unknown) => captureException(error),
  flush: (timeout?: number) => flush(timeout),
  withScope: (fn: (scope: { setTag: typeof setTag }) => void) => {
    fn({ setTag });
  },
}));

const DSN = "https://public@o0.ingest.sentry.io/0";

afterEach(() => {
  vi.clearAllMocks();
});

describe("createSentryErrorTracker", () => {
  it("returns the no-op tracker when no DSN is configured", () => {
    const tracker = createSentryErrorTracker({ environment: "test" });

    tracker.capture(new Error("boom"));

    // An unset DSN is a supported state — local, CI, and self-hosted
    // deployments without a tracker all take this path.
    expect(init).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("treats an empty DSN the same as an absent one", () => {
    createSentryErrorTracker({ dsn: "", environment: "test" });

    expect(init).not.toHaveBeenCalled();
  });

  /**
   * The regression this adapter exists to avoid. `@sentry/node` ships its own
   * OpenTelemetry SDK; this package already starts one. Two SDKs claiming the
   * global TracerProvider is how the previous attempt lost its traces.
   */
  it("never lets Sentry set up OpenTelemetry", () => {
    createSentryErrorTracker({ dsn: DSN, environment: "production" });

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        skipOpenTelemetrySetup: true,
        defaultIntegrations: false,
        integrations: [],
        tracesSampleRate: 0,
      }),
    );
  });

  it("leaves the global tracer provider untouched", () => {
    const before = trace.getTracerProvider();

    createSentryErrorTracker({ dsn: DSN, environment: "production" });

    expect(trace.getTracerProvider()).toBe(before);
  });

  it("passes environment and release through for release regression tracking", () => {
    createSentryErrorTracker({ dsn: DSN, environment: "staging", release: "abc123" });

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "staging", release: "abc123" }),
    );
  });

  it("omits release rather than sending undefined", () => {
    createSentryErrorTracker({ dsn: DSN, environment: "staging" });

    expect(init.mock.calls[0]?.[0]).not.toHaveProperty("release");
  });

  it("tags the event with the keys that correlate it to logs and traces", () => {
    const tracker = createSentryErrorTracker({ dsn: DSN, environment: "production" });
    const error = new Error("boom");

    tracker.capture(error, {
      requestId: "req_1",
      code: "INTERNAL",
      organizationId: "org_1",
      operation: "POST /v1/invoices",
    });

    expect(captureException).toHaveBeenCalledWith(error);
    expect(setTag).toHaveBeenCalledWith("requestId", "req_1");
    expect(setTag).toHaveBeenCalledWith("code", "INTERNAL");
    expect(setTag).toHaveBeenCalledWith("operation", "POST /v1/invoices");
  });

  it("tags only the keys it was given", () => {
    const tracker = createSentryErrorTracker({ dsn: DSN, environment: "production" });

    tracker.capture(new Error("boom"), { requestId: "req_1" });

    expect(setTag).toHaveBeenCalledExactlyOnceWith("requestId", "req_1");
  });

  it("captures with no context at all", () => {
    const tracker = createSentryErrorTracker({ dsn: DSN, environment: "production" });

    tracker.capture("a thrown string");

    expect(captureException).toHaveBeenCalledWith("a thrown string");
    expect(setTag).not.toHaveBeenCalled();
  });

  it("flushes with a bounded timeout so shutdown cannot hang", async () => {
    const tracker = createSentryErrorTracker({ dsn: DSN, environment: "production" });

    await tracker.flush();
    expect(flush).toHaveBeenCalledWith(2000);

    await tracker.flush(500);
    expect(flush).toHaveBeenCalledWith(500);
  });
});
