import type { Ctx } from "@repo/core";
import type { Mailer } from "@repo/email";
import type { Actor } from "@repo/types";
import type { Redis } from "ioredis";
import { describe, expect, it, vi } from "vitest";

import { createEmailSendHandler } from "./email-send.ts";

function asRedis(value: unknown): Redis {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- focused Redis test double
  return value as Redis;
}

describe("createEmailSendHandler", () => {
  it("returns before building context or sending mail when the job already completed", async () => {
    // The lease is unavailable and holds the completed marker, so this delivery
    // already happened on an earlier attempt.
    const set = vi.fn(() => Promise.resolve(null));
    const get = vi.fn(() => Promise.resolve("completed"));
    const idempotencyRedis = asRedis({ set, get });
    const buildCtx = vi.fn((_actor: Actor): Ctx => {
      throw new Error("buildCtx must not run for an already completed job");
    });
    const send = vi.fn(() => Promise.resolve({ id: "unused" }));
    const mailer: Mailer = { send };
    const handler = createEmailSendHandler({ buildCtx, mailer, idempotencyRedis });

    await handler(
      {
        to: "customer@example.com",
        subject: "Your receipt",
        organizationId: "01900000-0000-7000-8000-000000000001",
        idempotencyKey: "email-already-completed",
      },
      { jobId: "job-1", attemptsMade: 1 },
    );

    expect(get).toHaveBeenCalledWith("job:idempotency:email-already-completed");
    expect(buildCtx).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("throws without sending when another worker holds the lease", async () => {
    const set = vi.fn(() => Promise.resolve(null));
    const get = vi.fn(() => Promise.resolve("processing:some-other-worker"));
    const idempotencyRedis = asRedis({ set, get });
    const buildCtx = vi.fn((_actor: Actor): Ctx => {
      throw new Error("buildCtx must not run while another worker holds the lease");
    });
    const send = vi.fn(() => Promise.resolve({ id: "unused" }));
    const mailer: Mailer = { send };
    const handler = createEmailSendHandler({ buildCtx, mailer, idempotencyRedis });

    await expect(
      handler(
        {
          to: "customer@example.com",
          subject: "Your receipt",
          organizationId: "01900000-0000-7000-8000-000000000001",
          idempotencyKey: "email-in-progress",
        },
        { jobId: "job-2", attemptsMade: 1 },
      ),
    ).rejects.toThrow("idempotency lease held");

    expect(send).not.toHaveBeenCalled();
  });
});
