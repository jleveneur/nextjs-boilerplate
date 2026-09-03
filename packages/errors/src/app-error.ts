/**
 * Typed application errors.
 *
 * Core throws these; transports catch and map. We considered `Result<T, E>` and
 * rejected it — see docs/architecture/05-runtime-and-api.md §5. The hierarchy is
 * the contract: a `ValidationError` is never a Sentry incident, an `InternalError`
 * always is, and the boundary does not re-derive that from a string.
 */

import { ERROR_CODES, type ErrorCode } from "./codes.ts";
import type { ErrorSeverity } from "./severity.ts";

/**
 * Structured, redactable context attached to an error.
 *
 * Values reach logs and Sentry. Do not put secrets, tokens, or full request
 * bodies here — `@repo/logger` redacts known keys, but redaction is a backstop,
 * not a licence to attach anything.
 */
export type ErrorContext = Readonly<Record<string, unknown>>;

export type AppErrorOptions = {
  /** Stable public code. Defaults to the subclass's built-in code. */
  code?: ErrorCode;
  /** Human message. Safe for clients only when `expose` is true. */
  message: string;
  /** Structured context for logs and Sentry. Never sent to clients. */
  context?: ErrorContext;
  /** Underlying error. Always set when wrapping — stack traces must survive. */
  cause?: unknown;
};

/**
 * Base of every typed application error.
 *
 * Not constructed directly — use a subclass. The fields the boundary needs to map
 * an error to a response without `instanceof` branching on every class are all
 * here: `code`, `httpStatus`, `severity`, `expose`.
 */
export abstract class AppError extends Error {
  /** Stable public code. The client contract; never rename. */
  readonly code: ErrorCode;

  /** HTTP status the REST transport should use. oRPC maps via its own table. */
  readonly httpStatus: number;

  /** Whether this is expected domain traffic or a bug. Drives Sentry. */
  readonly severity: ErrorSeverity;

  /**
   * Whether {@link message} is safe to return to a client.
   *
   * When false, the transport returns a generic message plus the request id; the
   * real detail goes to logs and Sentry only.
   */
  readonly expose: boolean;

  /** Structured context for logs and Sentry. Never serialised to clients. */
  readonly context: ErrorContext;

  constructor(
    options: AppErrorOptions & {
      code: ErrorCode;
      httpStatus: number;
      severity: ErrorSeverity;
      expose: boolean;
    },
  ) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.severity = options.severity;
    this.expose = options.expose;
    this.context = options.context ?? {};
  }
}

/**
 * Input failed validation.
 *
 * Expected. Exposed. Not a Sentry incident — invalid input is traffic.
 */
export class ValidationError extends AppError {
  /** Field-level errors for forms and `errors` in problem+json. */
  readonly fieldErrors: ReadonlyArray<FieldError>;

  constructor(
    options: AppErrorOptions & {
      fieldErrors?: ReadonlyArray<FieldError>;
    },
  ) {
    super({
      ...options,
      code: options.code ?? ERROR_CODES.VALIDATION_FAILED,
      httpStatus: 400,
      severity: "expected",
      expose: true,
    });
    this.fieldErrors = options.fieldErrors ?? [];
  }
}

/** One field failure, as returned in problem+json `errors` and Server Actions. */
export type FieldError = {
  /** Dot-path to the field, e.g. `address.line1`. Empty string for form-level. */
  readonly path: string;
  readonly message: string;
};

/**
 * No usable credentials, or the session is invalid.
 *
 * Distinct from {@link ForbiddenError}: 401 means "authenticate"; 403 means
 * "authenticated, but not allowed". Confusing them makes clients retry the wrong
 * thing.
 */
export class UnauthorizedError extends AppError {
  constructor(options: AppErrorOptions = { message: "Authentication required" }) {
    super({
      ...options,
      code: options.code ?? ERROR_CODES.UNAUTHORIZED,
      httpStatus: 401,
      severity: "expected",
      expose: true,
    });
  }
}

/**
 * The actor is authenticated but not allowed to perform the action.
 *
 * For resources the actor may not even know exist, throw {@link NotFoundError}
 * instead — confirming existence to unauthorized callers is itself a leak.
 */
export class ForbiddenError extends AppError {
  constructor(options: AppErrorOptions = { message: "Forbidden" }) {
    super({
      ...options,
      code: options.code ?? ERROR_CODES.FORBIDDEN,
      httpStatus: 403,
      severity: "expected",
      expose: true,
    });
  }
}

/**
 * The target resource does not exist — or must appear not to.
 *
 * Also the correct response when an actor is unauthorized to know a resource
 * exists. Prefer this over {@link ForbiddenError} whenever the alternative would
 * confirm a record's presence.
 */
export class NotFoundError extends AppError {
  constructor(
    options: Omit<AppErrorOptions, "message"> & {
      /** Resource kind, used in the default message and as log context. */
      resource: string;
      /** Identifier looked up, attached to context for diagnosis. */
      id?: string;
      /** Defaults to "`resource` not found" / "`resource` not found: `id`". */
      message?: string;
    },
  ) {
    const { resource, id, ...rest } = options;
    super({
      ...rest,
      message:
        rest.message ??
        (id === undefined ? `${resource} not found` : `${resource} not found: ${id}`),
      code: rest.code ?? ERROR_CODES.NOT_FOUND,
      httpStatus: 404,
      severity: "expected",
      expose: true,
      context: { resource, ...(id === undefined ? {} : { id }), ...rest.context },
    });
  }
}

/**
 * The request conflicts with the current state of the resource.
 *
 * Expected domain outcome — "already archived", "already paid". Feature
 * subclasses pin a stable code: `class InvoiceAlreadyPaidError extends ConflictError`.
 */
export class ConflictError extends AppError {
  constructor(options: AppErrorOptions) {
    super({
      ...options,
      code: options.code ?? ERROR_CODES.CONFLICT,
      httpStatus: 409,
      severity: "expected",
      expose: true,
    });
  }
}

/**
 * The caller has exceeded a rate limit.
 *
 * Expected. The transport should also set `Retry-After` when the limit knows a
 * reset time; that header is not an error field.
 */
export class RateLimitError extends AppError {
  /** Seconds until the limit resets, when known. */
  readonly retryAfterSeconds: number | undefined;

  constructor(
    options: AppErrorOptions & {
      retryAfterSeconds?: number;
    } = { message: "Rate limit exceeded" },
  ) {
    super({
      ...options,
      code: options.code ?? ERROR_CODES.RATE_LIMITED,
      httpStatus: 429,
      severity: "expected",
      expose: true,
    });
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

/**
 * A dependency we call failed.
 *
 * Unexpected from the caller's point of view, and never exposed — vendor error
 * messages regularly contain URLs, account ids, and other internals. Always set
 * `cause` to the original error.
 */
export class ExternalServiceError extends AppError {
  constructor(
    options: Omit<AppErrorOptions, "message"> & {
      /** Vendor or service name, for logs ("stripe", "resend", "r2"). */
      service: string;
      /** Defaults to "External service failed: `service`". Prefer the default —
       * vendor messages belong in `cause`, not here. */
      message?: string;
    },
  ) {
    const { service, ...rest } = options;
    super({
      ...rest,
      message: rest.message ?? `External service failed: ${service}`,
      code: rest.code ?? ERROR_CODES.EXTERNAL_SERVICE_FAILED,
      httpStatus: 502,
      severity: "unexpected",
      expose: false,
      context: { service, ...rest.context },
    });
  }
}

/**
 * A programmer error — an invariant was violated, or something impossible happened.
 *
 * Always reported to Sentry. Never exposed. The transport error mapper produces
 * one of these when it sees an error named `InvariantViolation` from `@repo/utils`,
 * which is the seam across the same-layer boundary that forbids either package from
 * importing the other.
 */
export class InternalError extends AppError {
  constructor(options: AppErrorOptions = { message: "Internal error" }) {
    super({
      ...options,
      code: options.code ?? ERROR_CODES.INTERNAL,
      httpStatus: 500,
      severity: "unexpected",
      expose: false,
    });
  }
}
