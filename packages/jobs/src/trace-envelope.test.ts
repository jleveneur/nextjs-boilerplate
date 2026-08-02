import { describe, expect, it } from "vitest";

import {
  isJobDataEnvelope,
  JOB_TRACE_KEY,
  unwrapJobData,
  withJobTraceContext,
  wrapJobData,
} from "./trace-envelope.ts";

describe("trace-envelope", () => {
  it("detects nested job envelopes only", () => {
    expect(isJobDataEnvelope({ payload: { id: 1 } })).toBe(true);
    expect(isJobDataEnvelope({ payload: { id: 1 }, trace: { traceparent: "00-x" } })).toBe(true);
    expect(isJobDataEnvelope({ id: 1 })).toBe(false);
    expect(isJobDataEnvelope({ payload: { id: 1 }, extra: true })).toBe(false);
    expect(isJobDataEnvelope(null)).toBe(false);
  });

  it("returns the payload unchanged when there is no active span", () => {
    const wrapped = wrapJobData({ id: "job-1" });
    expect(wrapped).toEqual({ id: "job-1" });

    const unwrapped = unwrapJobData(wrapped);
    expect(unwrapped.payload).toEqual({ id: "job-1" });
    expect(unwrapped.trace).toBeUndefined();
  });

  it("unwraps a __trace field in a form Zod-stripping workers accept", () => {
    const carrier = {
      traceparent: "00-00000000000000000000000000000000-0000000000000000-01",
    };
    const data = {
      to: "a@b.co",
      subject: "hi",
      organizationId: "00000000-0000-7000-8000-000000000001",
      idempotencyKey: "k1",
      [JOB_TRACE_KEY]: carrier,
    };
    const unwrapped = unwrapJobData(data);
    expect(unwrapped.trace).toEqual(carrier);
    expect(unwrapped.payload).toEqual({
      to: "a@b.co",
      subject: "hi",
      organizationId: "00000000-0000-7000-8000-000000000001",
      idempotencyKey: "k1",
    });
    expect(unwrapped.payload).not.toHaveProperty(JOB_TRACE_KEY);
  });

  it("unwraps the nested Phase-14 envelope still in Redis", () => {
    const carrier = {
      traceparent: "00-00000000000000000000000000000000-0000000000000000-01",
    };
    const unwrapped = unwrapJobData({ payload: { id: "job-2" }, trace: carrier });
    expect(unwrapped.payload).toEqual({ id: "job-2" });
    expect(unwrapped.trace).toEqual(carrier);
  });

  it("runs the handler inside a consumer span", async () => {
    const result = await withJobTraceContext("email.send", undefined, () => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("restores parent context from a carrier", async () => {
    const carrier = {
      traceparent: "00-00000000000000000000000000000000-0000000000000000-01",
    };
    await expect(
      withJobTraceContext("email.send", carrier, () => Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");
  });

  it("passes through legacy unwrapped payloads", () => {
    expect(unwrapJobData({ legacy: true })).toEqual({ payload: { legacy: true } });
  });
});
