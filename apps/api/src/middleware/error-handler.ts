import {
  isAppError,
  normalizeError,
  RateLimitError,
  toProblemDetails,
  type AppError,
} from "@repo/errors";
import type { ErrorHandler } from "hono";

import type { ApiEnv } from "../app.ts";

/** Map thrown errors to RFC 9457 `application/problem+json`. */
export const errorHandler: ErrorHandler<ApiEnv> = (error, c) => {
  const requestId = c.get("requestId") ?? "unknown";
  const appError: AppError = isAppError(error) ? error : normalizeError(error);

  if (!appError.expose || appError.severity !== "expected") {
    c.get("container").logger.error(
      { err: appError, requestId, code: appError.code },
      appError.message,
    );
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
