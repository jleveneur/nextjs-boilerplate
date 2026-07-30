/**
 * Sentry Node SDK bootstrap. Expected domain errors stay out of Sentry —
 * callers filter at the transport boundary.
 */

import * as Sentry from "@sentry/node";

import type { SentryInitOptions } from "./types.ts";

export type SentryHandle = {
  shutdown(): Promise<void>;
};

export function initSentry(options: SentryInitOptions): SentryHandle {
  if (!options.enabled) {
    return { shutdown: () => Promise.resolve() };
  }

  if (options.dsn === undefined || options.dsn === "") {
    throw new Error("SENTRY_DSN is required when SENTRY_ENABLED=true");
  }

  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    // Sampling is aligned with OTel at the composition root / collector.
    tracesSampleRate: 0,
  });

  return {
    async shutdown() {
      await Sentry.close(2000);
    },
  };
}
