import {
  isAppError,
  normalizeError,
  RateLimitError,
  toProblemDetails,
  type AppError,
} from "@repo/errors";
import { captureUnexpectedException } from "@repo/observability";
import type { ErrorHandler } from "hono";

import type { ApiEnv } from "../app.ts";

function isAppErrorShape(value: unknown): value is AppError {
  if (isAppError(value)) {
    return true;
  }
  // Vitest can load `@repo/errors` twice; `instanceof` then fails across copies.
  if (!(value instanceof Error)) {
    return false;
  }
  return (
    typeof Reflect.get(value, "httpStatus") === "number" &&
    typeof Reflect.get(value, "code") === "string" &&
    typeof Reflect.get(value, "expose") === "boolean" &&
    typeof Reflect.get(value, "severity") === "string"
  );
}

function coerceAppError(error: unknown): AppError {
  let current: unknown = error;
  for (let i = 0; i < 6; i += 1) {
    if (isAppErrorShape(current)) {
      return current;
    }
    if (current instanceof Error && current.cause !== undefined) {
      current = current.cause;
      continue;
    }
    break;
  }
  return normalizeError(error);
}

/** Map thrown errors to RFC 9457 `application/problem+json`. */
export const errorHandler: ErrorHandler<ApiEnv> = (error, c) => {
  const requestId = c.get("requestId") ?? "unknown";
  const appError: AppError = coerceAppError(error);
  const actor = c.get("actor");

  if (!appError.expose || appError.severity !== "expected") {
    c.get("container").logger.error(
      { err: appError, requestId, code: appError.code },
      appError.message,
    );
    if (appError.severity === "unexpected") {
      captureUnexpectedException(appError, {
        requestId,
        userId: actor?.userId,
        organizationId: actor?.organizationId,
        extra: { code: appError.code },
      });
    }
  } else {
    c.get("container").logger.warn(
      { requestId, code: appError.code, context: appError.context },
      appError.message,
    );
  }

  const headers = new Headers({
    "content-type": "application/problem+json",
  });
  if (appError instanceof RateLimitError && appError.retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(appError.retryAfterSeconds));
  }

  const body = toProblemDetails(appError, { requestId });
  return new Response(JSON.stringify(body), {
    status: appError.httpStatus,
    headers,
  });
};
