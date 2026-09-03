import { describe, expect, it } from "vitest";

import { ForbiddenError, InternalError, NotFoundError, ValidationError } from "@repo/errors";
import { ORPCError } from "@orpc/server";

import { httpStatusToOrpcCode, rethrowAsOrpc, toOrpcError } from "./map-app-error.ts";

describe("httpStatusToOrpcCode", () => {
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
    expect(httpStatusToOrpcCode(status)).toBe(code);
  });
});

describe("toOrpcError", () => {
  it("exposes the message when AppError.expose is true", () => {
    const error = toOrpcError(new NotFoundError({ resource: "invoice", id: "i1" }));
    expect(error).toBeInstanceOf(ORPCError);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("invoice not found: i1");
    expect(error.data).toEqual({ appCode: "NOT_FOUND" });
  });

  it("hides the message when expose is false", () => {
    const error = toOrpcError(new InternalError({ message: "secret detail" }));
    expect(error.message).toBe("Internal server error");
    expect(error.data).toEqual({ appCode: "INTERNAL" });
  });
});

describe("rethrowAsOrpc", () => {
  it("wraps AppErrors", () => {
    expect(() => rethrowAsOrpc(new ForbiddenError({ message: "nope" }))).toThrow(ORPCError);
  });

  it("rethrows unknown errors", () => {
    expect(() => rethrowAsOrpc(new Error("boom"))).toThrow("boom");
  });

  it("wraps ValidationError as BAD_REQUEST", () => {
    try {
      rethrowAsOrpc(new ValidationError({ message: "bad" }));
    } catch (error) {
      expect(error).toBeInstanceOf(ORPCError);
      if (error instanceof ORPCError) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    }
  });
});
