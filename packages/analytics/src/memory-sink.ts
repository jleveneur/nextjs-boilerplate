/**
 * Recording sink for unit tests — never sends.
 */

import type { AnalyticsSink } from "./types.ts";

export type RecordedAnalyticsEvent = {
  event: string;
  properties?: Record<string, unknown>;
};

export function createMemoryAnalyticsSink(): AnalyticsSink & {
  events: RecordedAnalyticsEvent[];
} {
  const events: RecordedAnalyticsEvent[] = [];

  return {
    events,
    capture(event, properties) {
      events.push(properties === undefined ? { event } : { event, properties: { ...properties } });
      return Promise.resolve();
    },
    flush() {
      return Promise.resolve();
    },
    shutdown() {
      return Promise.resolve();
    },
  };
}
