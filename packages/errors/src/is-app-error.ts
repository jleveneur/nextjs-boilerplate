import { AppError } from "./app-error.ts";

/**
 * Whether `value` is an {@link AppError}.
 *
 * The transport mapper's first branch. Anything that is not an `AppError` is
 * treated as unexpected and wrapped in `InternalError` — including plain `Error`,
 * vendor SDK errors, and thrown strings.
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
