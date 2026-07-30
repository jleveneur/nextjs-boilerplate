/**
 * Stable public error codes.
 *
 * Codes are a versioned API contract: clients map them to localized messages, and
 * removing one is a major bump. They are never renamed. Format is
 * `SCREAMING_SNAKE_CASE` — see docs/architecture/04-conventions.md.
 *
 * Built-in codes for the hierarchy live here. Features add their own with
 * {@link defineErrorCode} (e.g. `INVOICE_ALREADY_PAID`) and keep them next to the
 * feature's error subclass — the registry is the *type* and the construction
 * helper, not a single file that every feature has to edit.
 */

import type { Brand } from "@repo/types";

/**
 * A machine-readable error code.
 *
 * Branded so a free string cannot be passed where a code is required. Construct
 * only through {@link defineErrorCode} or the built-in {@link ERROR_CODES}.
 */
export type ErrorCode = Brand<string, "ErrorCode">;

/**
 * Narrows a literal to {@link ErrorCode}.
 *
 * Features use this for their own codes. The helper exists so the brand stays
 * unforgeable: `as ErrorCode` scattered through the codebase would make every
 * string a code.
 */
export function defineErrorCode<const T extends string>(code: T): ErrorCode & T {
  // Branding's only runtime act. The assertion is the implementation; there is no
  // narrower check that could replace it — any string is a valid code at runtime,
  // and the brand exists to stop unvalidated strings reaching call sites.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return code as ErrorCode & T;
}

/**
 * Built-in codes for the hierarchy subclasses.
 *
 * Feature codes do not belong here — they live with the feature. Adding a code
 * that is not tied to a hierarchy class is a smell that a subclass is missing.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: defineErrorCode("VALIDATION_FAILED"),
  UNAUTHORIZED: defineErrorCode("UNAUTHORIZED"),
  FORBIDDEN: defineErrorCode("FORBIDDEN"),
  NOT_FOUND: defineErrorCode("NOT_FOUND"),
  CONFLICT: defineErrorCode("CONFLICT"),
  RATE_LIMITED: defineErrorCode("RATE_LIMITED"),
  EXTERNAL_SERVICE_FAILED: defineErrorCode("EXTERNAL_SERVICE_FAILED"),
  INTERNAL: defineErrorCode("INTERNAL"),
} as const;
