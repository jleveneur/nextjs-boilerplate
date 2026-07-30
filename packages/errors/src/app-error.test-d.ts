import { describe, it } from "vitest";

import { AppError } from "./app-error.ts";
import { ERROR_CODES } from "./codes.ts";

describe("AppError", () => {
  it("cannot be constructed directly", () => {
    // The abstract modifier is what forces callers through a subclass, which is
    // where severity and expose get their defaults. Without it the hierarchy is
    // optional.
    // @ts-expect-error AppError is abstract — use a subclass
    new AppError({
      message: "x",
      code: ERROR_CODES.INTERNAL,
      httpStatus: 500,
      severity: "unexpected",
      expose: false,
    });
  });
});
