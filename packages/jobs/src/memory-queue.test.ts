import { describe, expect, it } from "vitest";

import { createMemoryJobQueue } from "./memory-queue.ts";

describe("createMemoryJobQueue", () => {
  it("records enqueued jobs and validates payloads", async () => {
    const queue = createMemoryJobQueue();

    const withId = await queue.enqueue(
      "email.send",
      {
        to: "user@example.com",
        subject: "Hello",
        organizationId: "01900000-0000-7000-8000-000000000001",
        idempotencyKey: "k-1",
      },
      { jobId: "dedupe-1" },
    );

    expect(withId.id).toBe("dedupe-1");
    expect(queue.jobs).toHaveLength(1);
    expect(queue.jobs[0]?.name).toBe("email.send");
    expect(queue.jobs[0]?.opts?.jobId).toBe("dedupe-1");

    const autoId = await queue.enqueue("email.send", {
      to: "other@example.com",
      subject: "Hello again",
      organizationId: "01900000-0000-7000-8000-000000000001",
      idempotencyKey: "k-2",
    });
    expect(autoId.id).toMatch(/^memory-/);
    expect(queue.jobs).toHaveLength(2);
    expect(queue.jobs[1]?.opts).toBeUndefined();

    await expect(
      queue.enqueue("email.send", {
        to: "bad",
        subject: "x",
        organizationId: "not-a-uuid",
        idempotencyKey: "k-3",
      }),
    ).rejects.toThrow();

    queue.clear();
    expect(queue.jobs).toHaveLength(0);
    await queue.close();
  });
});
