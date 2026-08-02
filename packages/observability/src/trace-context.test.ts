import { TraceFlags, trace } from "@opentelemetry/api";
import { describe, expect, it, vi } from "vitest";

import { createFixedTraceContext, noopGetTraceContext } from "./testing/index.ts";
import { getTraceContext, spanContextToTraceContext } from "./trace-context.ts";

describe("getTraceContext", () => {
  it("returns empty context when no span is active", () => {
    expect(getTraceContext()).toEqual({});
  });

  it("returns ids from the active span", () => {
    vi.spyOn(trace, "getActiveSpan").mockReturnValue({
      spanContext() {
        return {
          traceId: "c".repeat(32),
          spanId: "d".repeat(16),
          traceFlags: TraceFlags.SAMPLED,
        };
      },
    } as ReturnType<typeof trace.getActiveSpan>);

    expect(getTraceContext()).toEqual({
      traceId: "c".repeat(32),
      spanId: "d".repeat(16),
    });
  });
});

describe("spanContextToTraceContext", () => {
  it("returns ids for a valid span context", () => {
    expect(
      spanContextToTraceContext({
        traceId: "a".repeat(32),
        spanId: "b".repeat(16),
        traceFlags: TraceFlags.SAMPLED,
      }),
    ).toEqual({
      traceId: "a".repeat(32),
      spanId: "b".repeat(16),
    });
  });

  it("returns empty for an invalid span context", () => {
    expect(
      spanContextToTraceContext({
        traceId: "0".repeat(32),
        spanId: "0".repeat(16),
        traceFlags: TraceFlags.NONE,
      }),
    ).toEqual({});
  });
});

describe("testing helpers", () => {
  it("returns a fixed context from the fake", () => {
    const get = createFixedTraceContext({
      traceId: "a".repeat(32),
      spanId: "b".repeat(16),
    });
    expect(get()).toEqual({
      traceId: "a".repeat(32),
      spanId: "b".repeat(16),
    });
  });

  it("noop correlator is empty", () => {
    expect(noopGetTraceContext()).toEqual({});
  });
});
