/**
 * Coerce an unknown thrown value into an {@link AppError}.
 *
 * Transports call this once at the boundary. Everything that leaves it is typed,
 * severity-classified, and safe to map to a response.
 */

import { InternalError, type AppError } from "./app-error.ts";
import { isAppError } from "./is-app-error.ts";

/**
 * Must match `INVARIANT_VIOLATION_NAME` in `@repo/utils`.
 *
 * Both packages are layer 0, so neither can import the other. The string is the
 * seam: utils names the error, this file recognises it. Matching on the message
 * instead would break the first time someone reworded one.
 */
const INVARIANT_VIOLATION_NAME = "InvariantViolation";

/**
 * Returns `error` when it is already an {@link AppError}; otherwise wraps it.
 *
 * - `AppError` → returned as-is.
 * - `Error` named `InvariantViolation` → {@link InternalError} with the original
 *   as `cause`. This is how an invariant failure becomes a reported incident.
 * - anything else → {@link InternalError} with a generic message and the original
 *   as `cause`. Vendor SDK errors land here until a caller wraps them in
 *   `ExternalServiceError` closer to the call site.
 */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (isInvariantViolation(error)) {
    return new InternalError({
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new InternalError({
      message: "Unexpected error",
      cause: error,
      context: { originalName: error.name, originalMessage: error.message },
    });
  }

  return new InternalError({
    message: "Unexpected error",
    cause: error,
    context: { thrownType: typeof error },
  });
}

function isInvariantViolation(error: unknown): error is Error {
  return error instanceof Error && error.name === INVARIANT_VIOLATION_NAME;
}
