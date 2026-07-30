import { describe, expect, it } from "vitest";

import {
  AppError,
  ConflictError,
  ExternalServiceError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "./app-error.ts";
import { defineErrorCode, ERROR_CODES } from "./codes.ts";

describe("hierarchy defaults", () => {
  it.each([
    {
      name: "ValidationError",
      error: new ValidationError({ message: "bad" }),
      status: 400,
      code: ERROR_CODES.VALIDATION_FAILED,
      severity: "expected",
      expose: true,
    },
    {
      name: "UnauthorizedError",
      error: new UnauthorizedError(),
      status: 401,
      code: ERROR_CODES.UNAUTHORIZED,
      severity: "expected",
      expose: true,
    },
    {
      name: "ForbiddenError",
      error: new ForbiddenError(),
      status: 403,
      code: ERROR_CODES.FORBIDDEN,
      severity: "expected",
      expose: true,
    },
    {
      name: "NotFoundError",
      error: new NotFoundError({ resource: "project", id: "p_1" }),
      status: 404,
      code: ERROR_CODES.NOT_FOUND,
      severity: "expected",
      expose: true,
    },
    {
      name: "ConflictError",
      error: new ConflictError({ message: "taken" }),
      status: 409,
      code: ERROR_CODES.CONFLICT,
      severity: "expected",
      expose: true,
    },
    {
      name: "RateLimitError",
      error: new RateLimitError(),
      status: 429,
      code: ERROR_CODES.RATE_LIMITED,
      severity: "expected",
      expose: true,
    },
    {
      name: "ExternalServiceError",
      error: new ExternalServiceError({ service: "stripe", message: "down" }),
      status: 502,
      code: ERROR_CODES.EXTERNAL_SERVICE_FAILED,
      severity: "unexpected",
      expose: false,
    },
    {
      name: "InternalError",
      error: new InternalError(),
      status: 500,
      code: ERROR_CODES.INTERNAL,
      severity: "unexpected",
      expose: false,
    },
  ] as const)(
    "$name carries the documented defaults",
    ({ error, status, code, severity, expose, name }) => {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(name);
      expect(error.httpStatus).toBe(status);
      expect(error.code).toBe(code);
      expect(error.severity).toBe(severity);
      expect(error.expose).toBe(expose);
    },
  );
});

describe("AppError", () => {
  it("preserves cause so the stack survives wrapping", () => {
    // The wrap-don't-replace rule. Without cause, the original stack is gone the
    // moment a boundary re-throws, and Sentry shows only the wrapper.
    const cause = new Error("root");
    const error = new InternalError({ message: "wrapped", cause });

    expect(error.cause).toBe(cause);
  });

  it("defaults context to an empty object", () => {
    expect(new InternalError().context).toStrictEqual({});
  });

  it("accepts structured context", () => {
    const error = new ConflictError({
      message: "taken",
      context: { organizationId: "org_1", attempt: 2 },
    });

    expect(error.context).toStrictEqual({ organizationId: "org_1", attempt: 2 });
  });

  it("allows a feature code to override the default", () => {
    const code = defineErrorCode("INVOICE_ALREADY_PAID");
    const error = new ConflictError({ message: "paid", code });

    expect(error.code).toBe(code);
    expect(error.httpStatus).toBe(409);
  });
});

describe("ValidationError", () => {
  it("defaults fieldErrors to an empty list", () => {
    expect(new ValidationError({ message: "bad" }).fieldErrors).toStrictEqual([]);
  });

  it("carries field errors for forms and problem+json", () => {
    const fieldErrors = [
      { path: "email", message: "required" },
      { path: "address.line1", message: "too short" },
    ];
    const error = new ValidationError({ message: "invalid", fieldErrors });

    expect(error.fieldErrors).toStrictEqual(fieldErrors);
  });
});

describe("NotFoundError", () => {
  it("builds a message from resource and id", () => {
    expect(new NotFoundError({ resource: "project", id: "p_1" }).message).toBe(
      "project not found: p_1",
    );
  });

  it("omits the id from the message when none was given", () => {
    expect(new NotFoundError({ resource: "project" }).message).toBe("project not found");
  });

  it("puts resource and id in context for logs", () => {
    // The client sees "project not found"; logs need the id to be useful. Context
    // is the channel — it never reaches the response body.
    expect(new NotFoundError({ resource: "project", id: "p_1" }).context).toMatchObject({
      resource: "project",
      id: "p_1",
    });
  });

  it("honours an explicit message", () => {
    expect(new NotFoundError({ resource: "project", id: "p_1", message: "gone" }).message).toBe(
      "gone",
    );
  });

  it("merges caller context with resource metadata", () => {
    expect(
      new NotFoundError({
        resource: "project",
        id: "p_1",
        context: { actorId: "u_1" },
      }).context,
    ).toStrictEqual({ resource: "project", id: "p_1", actorId: "u_1" });
  });
});

describe("ExternalServiceError", () => {
  it("names the service in the default message and context", () => {
    const error = new ExternalServiceError({ service: "stripe" });

    expect(error.message).toBe("External service failed: stripe");
    expect(error.context).toMatchObject({ service: "stripe" });
  });

  it("is never exposed — vendor messages leak internals", () => {
    // Stripe error messages contain request ids and account hints. expose: false
    // is the whole reason this class exists separately from InternalError.
    expect(
      new ExternalServiceError({ service: "stripe", message: "No such charge: ch_123" }).expose,
    ).toBe(false);
  });
});

describe("RateLimitError", () => {
  it("records retryAfterSeconds when known", () => {
    expect(
      new RateLimitError({ message: "slow down", retryAfterSeconds: 60 }).retryAfterSeconds,
    ).toBe(60);
  });

  it("leaves retryAfterSeconds undefined when unknown", () => {
    expect(new RateLimitError().retryAfterSeconds).toBeUndefined();
  });
});

describe("feature subclass pattern", () => {
  it("lets a feature pin a stable code on a hierarchy class", () => {
    // The documented pattern: InvoiceAlreadyPaidError extends ConflictError with a
    // fixed code. Clients match on the code; the HTTP status comes from the parent.
    const INVOICE_ALREADY_PAID = defineErrorCode("INVOICE_ALREADY_PAID");

    class InvoiceAlreadyPaidError extends ConflictError {
      constructor() {
        super({ message: "Invoice already paid", code: INVOICE_ALREADY_PAID });
      }
    }

    const error = new InvoiceAlreadyPaidError();

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.code).toBe(INVOICE_ALREADY_PAID);
    expect(error.httpStatus).toBe(409);
    expect(error.name).toBe("InvoiceAlreadyPaidError");
  });
});
