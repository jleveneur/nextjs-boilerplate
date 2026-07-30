import type { AnalyticsSink } from "../ports/analytics.ts";
import type { FlagProvider } from "../ports/flags.ts";

export function createNoopFlagProvider(): FlagProvider {
  return {
    isEnabled() {
      return Promise.resolve(false);
    },
  };
}

export function createNoopAnalyticsSink(): AnalyticsSink {
  return {
    capture() {
      return Promise.resolve();
    },
  };
}
