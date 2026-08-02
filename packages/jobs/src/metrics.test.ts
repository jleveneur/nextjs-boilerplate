import { afterEach, describe, expect, it, vi } from "vitest";

const { histogramRecord, counterAdd, gaugeCallback, getWaitingCount } = vi.hoisted(() => ({
  histogramRecord: vi.fn(),
  counterAdd: vi.fn(),
  gaugeCallback:
    vi.fn<(cb: (result: { observe: (value: number, attrs: object) => void }) => void) => void>(),
  getWaitingCount: vi.fn(() => Promise.resolve(3)),
}));

vi.mock("@opentelemetry/api", () => ({
  metrics: {
    getMeter: () => ({
      createHistogram: () => ({ record: histogramRecord }),
      createCounter: () => ({ add: counterAdd }),
      createObservableGauge: () => ({
        addCallback: (
          cb: (result: { observe: (value: number, attrs: object) => void }) => void,
        ) => {
          gaugeCallback(cb);
        },
      }),
    }),
  },
}));

import { createBullMqMetrics } from "./metrics.ts";

describe("createBullMqMetrics", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("records duration and failures, and samples waiting count", async () => {
    vi.useFakeTimers();

    const waitingQueue = {
      name: "default",
      getWaitingCount,
    };

    const handle = createBullMqMetrics(waitingQueue as never);

    expect(getWaitingCount).toHaveBeenCalled();
    expect(gaugeCallback).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(getWaitingCount).toHaveResolved();
    });

    const observe = vi.fn();
    const registered = gaugeCallback.mock.calls[0]?.[0];
    expect(registered).toBeTypeOf("function");
    registered?.({ observe });
    expect(observe).toHaveBeenCalledWith(3, { queue: "default" });

    handle.recordDuration("default", "email.send", 1.25);
    expect(histogramRecord).toHaveBeenCalledWith(1.25, {
      queue: "default",
      job_name: "email.send",
    });

    handle.recordFailure("default", "email.send");
    expect(counterAdd).toHaveBeenCalledWith(1, {
      queue: "default",
      job_name: "email.send",
    });

    getWaitingCount.mockResolvedValueOnce(7);
    await vi.advanceTimersByTimeAsync(5_000);
    registered?.({ observe });
    expect(observe).toHaveBeenLastCalledWith(7, { queue: "default" });

    handle.dispose();
  });

  it("keeps the last waiting sample when Redis polling fails", async () => {
    getWaitingCount.mockRejectedValueOnce(new Error("redis down"));
    const waitingQueue = {
      name: "default",
      getWaitingCount,
    };

    const handle = createBullMqMetrics(waitingQueue as never);
    // Initial poll rejected; gauge still registers with the default 0 sample.
    await Promise.resolve();

    const observe = vi.fn();
    const registered = gaugeCallback.mock.calls[0]?.[0];
    registered?.({ observe });
    expect(observe).toHaveBeenCalledWith(0, { queue: "default" });

    handle.dispose();
  });
});
