import { describe, expect, it } from "vitest";

import { ConflictError, InternalError, NotFoundError, ValidationError } from "./app-error.ts";
import { defineErrorCode } from "./codes.ts";
import { toProblemDetails } from "./problem-details.ts";

// cspell:ignore jqtest erreur survenue
const REQUEST_ID = "req_01jqtest";

describe("toProblemDetails", () => {
  it("maps an exposed error with its message intact", () => {
    const body = toProblemDetails(new NotFoundError({ resource: "project", id: "p_1" }), {
      requestId: REQUEST_ID,
    });

    expect(body).toStrictEqual({
      type: "urn:repo:error:NOT_FOUND",
      title: "Not Found",
      status: 404,
      detail: "project not found: p_1",
      code: "NOT_FOUND",
      request_id: REQUEST_ID,
    });
  });

  it("replaces the message when expose is false", () => {
    // The whole point of expose: the internal message reaches logs, never the client.
    // A regression here is a security bug, not a formatting one.
    const body = toProblemDetails(
      new InternalError({ message: "SELECT * FROM users WHERE password = ..." }),
      { requestId: REQUEST_ID },
    );

    expect(body.detail).not.toContain("SELECT");
    expect(body.detail).not.toContain("password");
    expect(body.detail).toContain("request_id");
    expect(body.code).toBe("INTERNAL");
    expect(body.status).toBe(500);
  });

  it("accepts a custom generic detail for i18n at the boundary", () => {
    const body = toProblemDetails(new InternalError({ message: "secret" }), {
      requestId: REQUEST_ID,
      genericDetail: "Une erreur est survenue.",
    });

    expect(body.detail).toBe("Une erreur est survenue.");
  });

  it("includes field errors only for ValidationError", () => {
    const withFields = toProblemDetails(
      new ValidationError({
        message: "invalid",
        fieldErrors: [{ path: "email", message: "required" }],
      }),
      { requestId: REQUEST_ID },
    );
    const withoutFields = toProblemDetails(new ValidationError({ message: "invalid" }), {
      requestId: REQUEST_ID,
    });
    const nonValidation = toProblemDetails(new ConflictError({ message: "taken" }), {
      requestId: REQUEST_ID,
    });

    expect(withFields.errors).toStrictEqual([{ path: "email", message: "required" }]);
    expect(withoutFields).not.toHaveProperty("errors");
    expect(nonValidation).not.toHaveProperty("errors");
  });

  it("keys the type URN by the stable code, including feature codes", () => {
    // Clients match on `code`, but `type` must still uniquely identify the problem.
    // A feature code has to appear in both.
    const code = defineErrorCode("INVOICE_ALREADY_PAID");
    const body = toProblemDetails(new ConflictError({ message: "paid", code }), {
      requestId: REQUEST_ID,
    });

    expect(body.type).toBe("urn:repo:error:INVOICE_ALREADY_PAID");
    expect(body.code).toBe("INVOICE_ALREADY_PAID");
  });

  it("never puts context or cause into the body", () => {
    const body = toProblemDetails(
      new InternalError({
        message: "secret",
        context: { sql: "SELECT 1", token: "sk_live_xxx" },
        cause: new Error("root"),
      }),
      { requestId: REQUEST_ID },
    );

    expect(JSON.stringify(body)).not.toContain("sql");
    expect(JSON.stringify(body)).not.toContain("sk_live");
    expect(JSON.stringify(body)).not.toContain("root");
    expect(body).not.toHaveProperty("context");
    expect(body).not.toHaveProperty("cause");
  });

  it("falls back to a generic title for an unknown status", () => {
    // Defence for a status that is not in the table. Better a bland "Error" than a
    // crash inside the error mapper.
    const error = new ConflictError({ message: "short and stout" });
    Object.defineProperty(error, "httpStatus", { value: 418 });

    expect(toProblemDetails(error, { requestId: REQUEST_ID }).title).toBe("Error");
  });
});
