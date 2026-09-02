/**
 * Map {@link AppError} → {@link ORPCError} so procedure failures keep a stable
 * app `code` on `data.appCode` and the original error on `cause`.
 */

import { ORPCError } from "@orpc/server";
import { isAppError, type AppError } from "@repo/errors";

type OrpcErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "BAD_GATEWAY"
  | "INTERNAL_SERVER_ERROR";

const HTTP_TO_ORPC: Record<number, OrpcErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "TOO_MANY_REQUESTS",
  502: "BAD_GATEWAY",
  500: "INTERNAL_SERVER_ERROR",
};

export function httpStatusToOrpcCode(httpStatus: number): OrpcErrorCode {
  return HTTP_TO_ORPC[httpStatus] ?? "INTERNAL_SERVER_ERROR";
}

export function toOrpcError(error: AppError): ORPCError<OrpcErrorCode, { appCode: string }> {
  return new ORPCError(httpStatusToOrpcCode(error.httpStatus), {
    message: error.expose ? error.message : "Internal server error",
    cause: error,
    data: { appCode: error.code },
  });
}

/** Re-throw AppErrors as ORPCErrors; leave everything else alone. */
export function rethrowAsOrpc(error: unknown): never {
  if (isAppError(error)) {
    throw toOrpcError(error);
  }

  throw error;
}
