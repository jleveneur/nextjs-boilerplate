import { afterEach, describe, expect, it } from "vitest";

import { initObservability } from "./init.ts";
import { getTraceContext } from "./trace-context.ts";

const handles: Array<{ shutdown(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.shutdown()));
});

describe("initObservability", () => {
  it("is a safe no-op when otel and sentry are disabled", async () => {
    const handle = initObservability({
      serviceName: "test",
      otel: { enabled: false },
      sentry: { enabled: false },
    });
    handles.push(handle);

    expect(getTraceContext()).toEqual({});
    await expect(handle.shutdown()).resolves.toBeUndefined();
  });

  it("requires an OTLP endpoint when otel is enabled", () => {
    expect(() =>
      initObservability({
        serviceName: "test",
        otel: { enabled: true },
        sentry: { enabled: false },
      }),
    ).toThrow(/OTEL_EXPORTER_OTLP_ENDPOINT/);
  });

  it("requires a DSN when sentry is enabled", () => {
    expect(() =>
      initObservability({
        serviceName: "test",
        otel: { enabled: false },
        sentry: { enabled: true },
      }),
    ).toThrow(/SENTRY_DSN/);
  });

  it("initializes sentry with service tag and shuts down cleanly", async () => {
    const handle = initObservability({
      serviceName: "api",
      otel: { enabled: false },
      sentry: { enabled: true, dsn: "https://public@sentry.example.com/1" },
    });
    handles.push(handle);
    await expect(handle.shutdown()).resolves.toBeUndefined();
  });
});
