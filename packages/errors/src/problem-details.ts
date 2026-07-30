/**
 * RFC 9457 Problem Details for the public REST API.
 *
 * The transport sets the status line and `Content-Type: application/problem+json`;
 * this function builds the body. Keeping the mapping here means tRPC, Server
 * Actions, and jobs can each have their own shape without re-implementing the
 * expose/severity rules.
 */

import { ValidationError, type AppError } from "./app-error.ts";

/** RFC 9457 problem+json body, with our stable `code` and `request_id` extensions. */
export type ProblemDetails = {
  /**
   * URI identifying the problem type.
   *
   * A URN keyed by the stable code, not a hosted page. Hosting a human-readable
   * type document per code is valuable later; the URN stays stable when that
   * happens. Clients should match on `code`, not on `type`.
   */
  readonly type: string;
  /** Short, stable summary derived from the status text. */
  readonly title: string;
  /** HTTP status. Duplicated from the response line per the RFC. */
  readonly status: number;
  /**
   * Human-readable explanation.
   *
   * Safe for clients when the error is exposed; a generic message plus guidance
   * to use `request_id` when it is not. May change between versions — clients
   * match on `code`.
   */
  readonly detail: string;
  /** Stable machine-readable code. The client contract. */
  readonly code: string;
  /** Field-level errors, present only for {@link ValidationError}. */
  readonly errors?: ReadonlyArray<{ readonly path: string; readonly message: string }>;
  /** Correlation id. Always present so a support ticket can find the log line. */
  readonly request_id: string;
};

export type ProblemDetailsOptions = {
  /** Correlation id assigned at the edge. Required — without it support cannot help. */
  readonly requestId: string;
  /**
   * Message returned when `expose` is false.
   *
   * Override for i18n at the boundary. Defaults to English; the code is what
   * clients localize against.
   */
  readonly genericDetail?: string;
};

const STATUS_TITLE: Readonly<Record<number, string>> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
};

/**
 * Maps an {@link AppError} to an RFC 9457 problem+json body.
 *
 * Applies the expose rule: internal detail never leaves the process. Field errors
 * are included only for {@link ValidationError}, where they are the point.
 */
export function toProblemDetails(error: AppError, options: ProblemDetailsOptions): ProblemDetails {
  const title = STATUS_TITLE[error.httpStatus] ?? "Error";
  const detail = error.expose
    ? error.message
    : (options.genericDetail ??
      "An unexpected error occurred. Refer to request_id when contacting support.");

  const body: ProblemDetails = {
    type: `urn:repo:error:${error.code}`,
    title,
    status: error.httpStatus,
    detail,
    code: error.code,
    request_id: options.requestId,
  };

  if (error instanceof ValidationError && error.fieldErrors.length > 0) {
    return { ...body, errors: error.fieldErrors };
  }

  return body;
}
