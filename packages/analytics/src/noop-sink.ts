/**
 * Discarding sink — production local default and composition roots that opt out.
 */

import type { AnalyticsSink } from "./types.ts";

export function createNoopAnalyticsSink(): AnalyticsSink {
  return {
    capture() {
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
