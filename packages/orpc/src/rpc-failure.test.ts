import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { InternalError, NotFoundError, ValidationError } from "@repo/errors";

import { toOrpcError } from "./map-app-error.ts";
import { describeRpcFailure } from "./rpc-failure.ts";

describe("describeRpcFailure", () => {
  it("treats an exposed expected AppError as warn-level", () => {
    const appError = new ValidationError({ message: "bad input", context: { field: "email" } });
    const failure = describeRpcFailure(toOrpcError(appError), ["billing", "checkout"]);

    expect(failure).toMatchObject({
      expected: true,
      message: "bad input",
      code: "VALIDATION_FAILED",
      path: "billing.checkout",
      context: { field: "email" },
    });
    expect(failure).not.toHaveProperty("err");
  });

  it("classifies a bare expected AppError the same way", () => {
    const failure = describeRpcFailure(new ValidationError({ message: "bad" }), ["form"]);

    expect(failure.expected).toBe(true);
    expect(failure.code).toBe("VALIDATION_FAILED");
    expect(failure.path).toBe("form");
  });

  it("unwraps AppError from ORPCError.cause", () => {
    const appError = new NotFoundError({ resource: "invoice", id: "i1" });
    const failure = describeRpcFailure(toOrpcError(appError), ["invoice", "get"]);

    expect(failure.expected).toBe(true);
    expect(failure.code).toBe("NOT_FOUND");
    expect(failure.message).toContain("invoice");
  });

  it("treats InternalError as an incident even when wrapped for the wire", () => {
    const appError = new InternalError({ message: "secret detail", context: { jobId: "j1" } });
    const failure = describeRpcFailure(toOrpcError(appError), ["jobs", "run"]);

    expect(failure.expected).toBe(false);
    if (failure.expected) {
      return;
    }
    expect(failure.err).toBe(appError);
    expect(failure.message).toBe("secret detail");
    expect(failure.context).toEqual({ jobId: "j1" });
  });

  it("treats auth middleware ORPCError as expected without an AppError", () => {
    const failure = describeRpcFailure(
      new ORPCError("UNAUTHORIZED", { message: "Authentication required" }),
      ["me"],
    );

    expect(failure).toEqual({
      expected: true,
      message: "Authentication required",
      code: "UNAUTHORIZED",
      path: "me",
    });
  });

  it("treats INTERNAL_SERVER_ERROR without an AppError as an incident", () => {
    const error = new ORPCError("INTERNAL_SERVER_ERROR", { message: "boom" });
    const failure = describeRpcFailure(error, ["x"]);

    expect(failure.expected).toBe(false);
    if (failure.expected) {
      return;
    }
    expect(failure.code).toBe("INTERNAL_SERVER_ERROR");
    expect(failure.message).toBe("boom");
    expect(failure.err.cause).toBe(error);
  });

  it("wraps a plain Error as an incident", () => {
    const error = new Error("disk full");
    const failure = describeRpcFailure(error, ["storage", "put"]);

    expect(failure.expected).toBe(false);
    if (failure.expected) {
      return;
    }
    expect(failure.code).toBe("INTERNAL");
    expect(failure.message).toBe("Unexpected error");
    expect(failure.err.cause).toBe(error);
    expect(failure.path).toBe("storage.put");
  });
});
