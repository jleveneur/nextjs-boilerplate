/**
 * BullMQ job data envelope that carries W3C trace context across the queue.
 *
 * The {@link JobQueue} port stays payload-clean; only this adapter wraps/unwraps.
 *
 * Rolling-deploy safety: trace is attached as a reserved `__trace` field on the
 * payload object. Zod's default object parsing strips unknown keys, so older
 * workers that call `parseJobPayload(job.data)` directly still succeed. The
 * nested `{ payload, trace }` shape is still accepted on unwrap for any jobs
 * already in Redis from the first Phase 14 enqueue format.
 */

import { context, propagation, SpanStatusCode, trace } from "@opentelemetry/api";

/** Reserved key — must not collide with job payload fields. */
export const JOB_TRACE_KEY = "__trace";

export type TraceCarrier = {
  traceparent?: string;
  tracestate?: string;
};

export type JobDataEnvelope = {
  payload: unknown;
  trace?: TraceCarrier;
};

export function isJobDataEnvelope(value: unknown): value is JobDataEnvelope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  if (!("payload" in value)) {
    return false;
  }
  return Object.keys(value).every((key) => key === "payload" || key === "trace");
}

/** Inject the active span context into a carrier for the job envelope. */
export function injectTraceCarrier(): TraceCarrier | undefined {
  const carrier: TraceCarrier = {};
  propagation.inject(context.active(), carrier);
  if (carrier.traceparent === undefined) {
    return undefined;
  }
  return carrier;
}

/**
 * Attach an optional trace carrier without breaking legacy workers.
 * When there is no active context, returns the payload unchanged.
 */
export function wrapJobData(payload: unknown): unknown {
  const carrier = injectTraceCarrier();
  if (carrier === undefined) {
    return payload;
  }

  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    return { ...payload, [JOB_TRACE_KEY]: carrier };
  }

  // Non-object payloads fall back to the nested envelope.
  return { payload, trace: carrier };
}

export function unwrapJobData(data: unknown): {
  payload: unknown;
  trace?: TraceCarrier;
} {
  if (isJobDataEnvelope(data)) {
    return data.trace === undefined
      ? { payload: data.payload }
      : { payload: data.payload, trace: data.trace };
  }

  if (typeof data === "object" && data !== null && !Array.isArray(data) && JOB_TRACE_KEY in data) {
    const payload: Record<string, unknown> = {};
    let traceCarrier: TraceCarrier | undefined;
    for (const [key, value] of Object.entries(data)) {
      if (key === JOB_TRACE_KEY) {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          traceCarrier = value;
        }
        continue;
      }
      payload[key] = value;
    }
    return traceCarrier === undefined ? { payload } : { payload, trace: traceCarrier };
  }

  // Legacy / unwrapped jobs (tests, pre-Phase-14 payloads).
  return { payload: data };
}

/**
 * Restore the parent context from a carrier and run `fn` inside an active
 * consumer span named `jobs.<name>`.
 */
export async function withJobTraceContext<T>(
  jobName: string,
  carrier: TraceCarrier | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const parent =
    carrier === undefined ? context.active() : propagation.extract(context.active(), carrier);
  const tracer = trace.getTracer("@repo/jobs");
  return context.with(parent, async () => {
    const span = tracer.startSpan(`jobs.${jobName}`);
    try {
      return await context.with(trace.setSpan(context.active(), span), fn);
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR, message: "error" });
      throw error;
    } finally {
      span.end();
    }
  });
}
