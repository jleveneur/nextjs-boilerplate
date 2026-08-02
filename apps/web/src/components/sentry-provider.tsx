"use client";

import { useEffect, type ReactNode } from "react";

import { env } from "../env/client.ts";

/**
 * Boots browser Sentry when `NEXT_PUBLIC_SENTRY_DSN` is set.
 * Server-side Sentry stays on `@repo/observability` via `instrumentation.ts`.
 */
export function SentryProvider({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    const dsn = env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn === undefined || dsn === "") {
      return;
    }
    void (async () => {
      const Sentry = await import("@sentry/browser");
      Sentry.init({
        dsn,
        environment: env.NEXT_PUBLIC_APP_ENV,
        sendDefaultPii: false,
        beforeSend(event) {
          if (event.request?.headers !== undefined) {
            delete event.request.headers["authorization"];
            delete event.request.headers["cookie"];
          }
          return event;
        },
      });
    })();
  }, []);

  return children;
}
