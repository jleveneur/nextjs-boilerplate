/**
 * Sentry adapter, in capture-only mode.
 *
 * The important part is what is switched **off**. `@sentry/node` v8+ ships its
 * own OpenTelemetry SDK and initialises it by default; this package already
 * starts a `NodeSDK` with its own instrumentations. Two SDKs registering a
 * global `TracerProvider` in one process is how an earlier attempt at this went
 * in circles — traces went missing and nobody could tell which SDK owned the
 * context.
 *
 * So Sentry is reduced to the one job OTel does not do: grouping exceptions.
 * `skipOpenTelemetrySetup` leaves the provider alone and `defaultIntegrations:
 * false` removes the auto-instrumentation that would hook `http`, `pg` and the
 * rest a second time. Tracing stays with OTel and Jaeger, where it already
 * works. `sentry-tracker.test.ts` pins that the global provider is untouched.
 *
 * The DSN is the only switch: unset means the no-op tracker, which is the
 * default everywhere except a deployment that has opted in.
 *
 * Works unchanged against self-hosted GlitchTip, which speaks the same
 * protocol — the choice is a DSN, not an architecture.
 */

import * as Sentry from "@sentry/node";

import { createNoopErrorTracker, type ErrorTracker } from "./error-tracker.ts";

export type SentryTrackerOptions = {
  /** Absent or empty selects the no-op tracker. */
  dsn?: string;
  /** `APP_ENV` — separates staging noise from production incidents. */
  environment: string;
  /** Git SHA. Lets Sentry attribute a regression to a release. */
  release?: string;
};

export function createSentryErrorTracker(options: SentryTrackerOptions): ErrorTracker {
  if (options.dsn === undefined || options.dsn === "") {
    return createNoopErrorTracker();
  }

  Sentry.init({
    dsn: options.dsn,
    environment: options.environment,
    ...(options.release === undefined ? {} : { release: options.release }),

    // See the file comment: this is the whole reason the adapter is safe to add
    // next to an existing OpenTelemetry SDK.
    skipOpenTelemetrySetup: true,
    defaultIntegrations: false,
    integrations: [],

    // Tracing and profiling belong to OTel here. Sending spans from both would
    // double-bill and disagree.
    tracesSampleRate: 0,
  });

  return {
    capture(error: unknown, context = {}) {
      Sentry.withScope((scope) => {
        // `requestId` is the join key between a Sentry event, a log line and a
        // Jaeger trace, so it goes on as a tag rather than buried in context.
        for (const [key, value] of Object.entries(context)) {
          if (value !== undefined) {
            scope.setTag(key, value);
          }
        }

        Sentry.captureException(error);
      });
    },

    async flush(timeoutMs = 2000) {
      await Sentry.flush(timeoutMs);
    },
  };
}
