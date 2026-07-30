import { describe, expect, it } from "vitest";

import { ForbiddenError, InternalError } from "@repo/errors";

import { formatTrpcError } from "./error-formatter.ts";

describe("formatTrpcError", () => {
  const base = {
    shape: { message: "fallback", data: { httpStatus: 500, code: "INTERNAL_SERVER_ERROR" } },
    error: { cause: undefined as unknown },
  };

  it("passes through when the cause is not an AppError", () => {
    expect(formatTrpcError(base)).toStrictEqual(base.shape);
  });

  it("adds appCode and exposes the message for expected errors", () => {
    const cause = new ForbiddenError({ message: "nope" });
    expect(
      formatTrpcError({
        shape: base.shape,
        error: { cause },
      }),
    ).toMatchObject({
      message: "nope",
      data: { appCode: "FORBIDDEN" },
    });
  });

  it("keeps the shape message when expose is false", () => {
    const cause = new InternalError({ message: "secret" });
    expect(
      formatTrpcError({
        shape: base.shape,
        error: { cause },
      }).message,
    ).toBe("fallback");
  });
});
