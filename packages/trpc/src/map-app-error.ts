/**
 * Map {@link AppError} → {@link TRPCError} so procedure failures keep a stable
 * app `code` on `cause` for the error formatter.
 */

import { TRPCError, type TRPC_ERROR_CODE_KEY } from "@trpc/server";
import { isAppError, type AppError } from "@repo/errors";

const HTTP_TO_TRPC: Record<number, TRPC_ERROR_CODE_KEY> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "TOO_MANY_REQUESTS",
  502: "BAD_GATEWAY",
  500: "INTERNAL_SERVER_ERROR",
};

export function httpStatusToTrpcCode(httpStatus: number): TRPC_ERROR_CODE_KEY {
  return HTTP_TO_TRPC[httpStatus] ?? "INTERNAL_SERVER_ERROR";
}

export function toTrpcError(error: AppError): TRPCError {
  return new TRPCError({
    code: httpStatusToTrpcCode(error.httpStatus),
    message: error.expose ? error.message : "Internal server error",
    cause: error,
  });
}

/** Re-throw AppErrors as TRPCErrors; leave everything else alone. */
export function rethrowAsTrpc(error: unknown): never {
  if (isAppError(error)) {
    throw toTrpcError(error);
  }

  throw error;
}
