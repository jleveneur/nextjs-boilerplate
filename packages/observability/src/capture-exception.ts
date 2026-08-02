/**
 * Report unexpected errors to Sentry. Callers must filter expected domain
 * errors before invoking this.
 */

import { createHash } from "node:crypto";

import * as Sentry from "@sentry/node";

export type CaptureExceptionContext = {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  extra?: Record<string, unknown>;
};

/** One-way id for Sentry user context — never the raw user UUID. */
function hashId(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function captureUnexpectedException(
  error: unknown,
  context: CaptureExceptionContext = {},
): void {
  Sentry.withScope((scope) => {
    if (context.requestId !== undefined) {
      scope.setTag("requestId", context.requestId);
    }
    if (context.userId !== undefined || context.organizationId !== undefined) {
      scope.setUser({
        ...(context.userId === undefined ? {} : { id: hashId(context.userId) }),
        ...(context.organizationId === undefined
          ? {}
          : { segment: hashId(context.organizationId) }),
      });
    }
    if (context.extra !== undefined) {
      scope.setExtras(context.extra);
    }
    Sentry.captureException(error);
  });
}
