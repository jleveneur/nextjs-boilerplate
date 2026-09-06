/**
 * Classify an oRPC handler failure for the transport log line.
 *
 * Procedures already map {@link AppError} → {@link ORPCError}. This unwraps
 * that (and auth middleware that throws `ORPCError` directly) so the RPC
 * route can log once: expected client errors at `warn`, everything else at
 * `error`.
 */

import { ORPCError } from "@orpc/server";

import { isAppError, normalizeError, type AppError, type ErrorContext } from "@repo/errors";

/** oRPC 4xx / client-closed codes. 5xx (`INTERNAL_SERVER_ERROR`, `BAD_GATEWAY`) stay incidents. */
const EXPECTED_ORPC_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_SUPPORTED",
  "TIMEOUT",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "UNPROCESSABLE_CONTENT",
  "TOO_MANY_REQUESTS",
  "CLIENT_CLOSED_REQUEST",
]);

type RpcFailureFields = {
  message: string;
  code: string;
  path: string;
  context?: ErrorContext;
};

export type RpcFailureLog =
  | ({ expected: true } & RpcFailureFields)
  | ({ expected: false; err: AppError } & RpcFailureFields);

function isOrpcError(error: unknown): error is ORPCError<string, unknown> {
  return error instanceof ORPCError;
}

function unwrapAppError(error: unknown): AppError | undefined {
  if (isAppError(error)) {
    return error;
  }
  if (isOrpcError(error) && isAppError(error.cause)) {
    return error.cause;
  }
  return undefined;
}

function orpcWireCode(error: unknown): string | undefined {
  if (!isOrpcError(error)) {
    return undefined;
  }
  return error.code;
}

function isExpected(error: unknown, appError: AppError | undefined): boolean {
  if (appError !== undefined) {
    return appError.expose && appError.severity === "expected";
  }
  const wireCode = orpcWireCode(error);
  return wireCode !== undefined && EXPECTED_ORPC_CODES.has(wireCode);
}

export function describeRpcFailure(
  error: unknown,
  path: ReadonlyArray<string | number>,
): RpcFailureLog {
  const appError = unwrapAppError(error);
  const expected = isExpected(error, appError);
  const joinedPath = path.join(".");
  const wireCode = orpcWireCode(error);
  const message = appError?.message ?? (isOrpcError(error) ? error.message : undefined);

  if (expected) {
    return {
      expected: true,
      message: message ?? "request failed",
      code: appError?.code ?? wireCode ?? "UNKNOWN",
      path: joinedPath,
      ...(appError === undefined ? {} : { context: appError.context }),
    };
  }

  const err = appError ?? normalizeError(error);
  return {
    expected: false,
    err,
    message: message ?? err.message,
    code: appError?.code ?? wireCode ?? err.code,
    path: joinedPath,
    ...(appError === undefined ? {} : { context: appError.context }),
  };
}
