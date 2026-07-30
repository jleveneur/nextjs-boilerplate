import { TraceFlags } from "@opentelemetry/api";
import { describe, expect, it } from "vitest";

import { createFixedTraceContext, noopGetTraceContext } from "./testing/index.ts";
import { getTraceContext, spanContextToTraceContext } from "./trace-context.ts";

describe("getTraceContext", () => {
  it("returns empty context when no span is active", () => {
    expect(getTraceContext()).toEqual({});
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
