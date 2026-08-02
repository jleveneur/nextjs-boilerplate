/**
 * Sentry Node SDK bootstrap. Expected domain errors stay out of Sentry —
 * callers filter at the transport boundary.
 */

import * as Sentry from "@sentry/node";

import type { SentryInitOptions } from "./types.ts";

export type SentryHandle = {
  shutdown(): Promise<void>;
};

const PII_KEYS = new Set([
  "password",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apiKey",
  "api_key",
  "cardNumber",
  "email",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scrubValue(value: unknown, depth: number): unknown {
  if (depth <= 0 || value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth - 1));
  }
  if (!isRecord(value)) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = PII_KEYS.has(key) ? "[Redacted]" : scrubValue(nested, depth - 1);
  }
  return out;
}

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
    tracesSampleRate: options.tracesSampleRate ?? 0,
    beforeSend(event) {
      if (event.extra !== undefined) {
        const scrubbed = scrubValue(event.extra, 4);
        if (isRecord(scrubbed)) {
          event.extra = scrubbed;
        }
      }
      if (event.user?.email !== undefined) {
        delete event.user.email;
      }
      return event;
    },
  });

  return {
    async shutdown() {
      await Sentry.close(2000);
    },
  };
}
