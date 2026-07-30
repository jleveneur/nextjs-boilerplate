import { describe, expect, it } from "vitest";

import { ForbiddenError, InternalError, NotFoundError, ValidationError } from "@repo/errors";
import { TRPCError } from "@trpc/server";

import { httpStatusToTrpcCode, rethrowAsTrpc, toTrpcError } from "./map-app-error.ts";

describe("httpStatusToTrpcCode", () => {
  it.each([
    [400, "BAD_REQUEST"],
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [429, "TOO_MANY_REQUESTS"],
    [500, "INTERNAL_SERVER_ERROR"],
    [502, "BAD_GATEWAY"],
    [418, "INTERNAL_SERVER_ERROR"],
  ] as const)("maps %i → %s", (status, code) => {
    expect(httpStatusToTrpcCode(status)).toBe(code);
  });
});

describe("toTrpcError", () => {
  it("exposes the message when AppError.expose is true", () => {
    const error = toTrpcError(new NotFoundError({ resource: "invoice", id: "i1" }));
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("invoice not found: i1");
  });

  it("hides the message when expose is false", () => {
    const error = toTrpcError(new InternalError({ message: "secret detail" }));
    expect(error.message).toBe("Internal server error");
  });
});

describe("rethrowAsTrpc", () => {
  it("wraps AppErrors", () => {
    expect(() => rethrowAsTrpc(new ForbiddenError({ message: "nope" }))).toThrow(TRPCError);
  });

  it("rethrows unknown errors", () => {
    expect(() => rethrowAsTrpc(new Error("boom"))).toThrow("boom");
  });

  it("wraps ValidationError as BAD_REQUEST", () => {
    try {
      rethrowAsTrpc(new ValidationError({ message: "bad" }));
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});
