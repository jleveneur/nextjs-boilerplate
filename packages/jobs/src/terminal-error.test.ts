import { UnrecoverableError } from "bullmq";
import { describe, expect, it } from "vitest";

import { TerminalJobError, isTerminalJobError } from "./terminal-error.ts";

describe("TerminalJobError", () => {
  it("is an UnrecoverableError recognised by isTerminalJobError", () => {
    const error = new TerminalJobError("gone", { cause: new Error("missing") });
    expect(error).toBeInstanceOf(UnrecoverableError);
    expect(error.name).toBe("TerminalJobError");
    expect(isTerminalJobError(error)).toBe(true);
    expect(isTerminalJobError(new Error("retryable"))).toBe(false);
  });
});
