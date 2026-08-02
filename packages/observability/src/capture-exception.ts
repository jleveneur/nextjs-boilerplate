/**
 * Report unexpected errors to Sentry. Callers must filter expected domain
 * errors before invoking this.
 */

import * as Sentry from "@sentry/node";

export type CaptureExceptionContext = {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  extra?: Record<string, unknown>;
};

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
        ...(context.userId === undefined ? {} : { id: context.userId }),
        ...(context.organizationId === undefined ? {} : { segment: context.organizationId }),
      });
    }
    if (context.extra !== undefined) {
      scope.setExtras(context.extra);
    }
    Sentry.captureException(error);
  });
}
