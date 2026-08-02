/**
 * OpenTelemetry metrics for BullMQ — exported via the collector to Prometheus.
 *
 * With unit `s`, the Prometheus exporter yields:
 *   bullmq_job_duration_seconds_bucket / _count / _sum
 *   bullmq_job_failed_total
 *   bullmq_queue_waiting
 */

import { metrics, type Counter, type Histogram, type Meter } from "@opentelemetry/api";
import type { Queue } from "bullmq";

const METER_NAME = "@repo/jobs";
const WAITING_POLL_MS = 5_000;

export type BullMqMetrics = {
  recordDuration(queue: string, jobName: string, durationSeconds: number): void;
  recordFailure(queue: string, jobName: string): void;
  dispose(): void;
};

function getMeter(): Meter {
  return metrics.getMeter(METER_NAME);
}

/**
 * Instruments job duration, failures, and an observable waiting-count gauge.
 * `waitingQueue` is a BullMQ Queue bound to the same name as the worker.
 */
export function createBullMqMetrics(waitingQueue: Queue): BullMqMetrics {
  const meter = getMeter();

  const duration: Histogram = meter.createHistogram("bullmq.job.duration", {
    description: "BullMQ job processing duration in seconds",
    unit: "s",
  });

  const failed: Counter = meter.createCounter("bullmq.job.failed", {
    description: "BullMQ jobs that failed terminally or exhausted retries",
  });

  const gauge = meter.createObservableGauge("bullmq.queue.waiting", {
    description: "BullMQ jobs waiting in the queue",
  });

  const queueName = waitingQueue.name;
  let waitingCount = 0;

  const poll = (): void => {
    void waitingQueue
      .getWaitingCount()
      .then((count) => {
        waitingCount = count;
        return undefined;
      })
      .catch(() => {
        // Leave the last sample; Redis blips should not throw into the event loop.
        return undefined;
      });
  };
  poll();
  const timer = setInterval(poll, WAITING_POLL_MS);
  timer.unref?.();

  gauge.addCallback((observableResult) => {
    observableResult.observe(waitingCount, { queue: queueName });
  });

  return {
    recordDuration(queue, jobName, durationSeconds) {
      duration.record(durationSeconds, { queue, job_name: jobName });
    },
    recordFailure(queue, jobName) {
      failed.add(1, { queue, job_name: jobName });
    },
    dispose() {
      clearInterval(timer);
    },
  };
}
