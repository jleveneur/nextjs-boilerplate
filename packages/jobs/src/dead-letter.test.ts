import { describe, expect, it, vi } from "vitest";

import { moveToDeadLetter } from "./dead-letter.ts";
import type { DeadLetterRecord } from "./types.ts";

const record: DeadLetterRecord = {
  queueName: "default",
  dlqName: "default-dlq",
  jobName: "email.send",
  jobId: "job-1",
  attemptsMade: 5,
  failedReason: "handler failed",
  payload: { to: "person@example.com" },
};

describe("moveToDeadLetter", () => {
  it("reports enqueue failures without invoking the success callback", async () => {
    const error = new Error("Redis unavailable");
    const onDeadLetter = vi.fn();
    const onDeadLetterError = vi.fn();

    await moveToDeadLetter({
      record,
      enqueue: () => Promise.reject(error),
      onDeadLetter,
      onDeadLetterError,
    });

    expect(onDeadLetter).not.toHaveBeenCalled();
    expect(onDeadLetterError).toHaveBeenCalledWith({
      record,
      stage: "enqueue",
      error,
    });
  });

  it("reports failures from the dead-letter notification callback", async () => {
    const error = new Error("notification failed");
    const onDeadLetterError = vi.fn();

    await moveToDeadLetter({
      record,
      enqueue: () => Promise.resolve(),
      onDeadLetter: () => Promise.reject(error),
      onDeadLetterError,
    });

    expect(onDeadLetterError).toHaveBeenCalledWith({
      record,
      stage: "notify",
      error,
    });
  });

  it("rejects when no error callback observes the failure", async () => {
    const error = new Error("Redis unavailable");

    await expect(
      moveToDeadLetter({
        record,
        enqueue: () => Promise.reject(error),
      }),
    ).rejects.toBe(error);
  });
});
