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
  it("returns before building context or sending mail when the claim fails", async () => {
    const set = vi.fn(() => Promise.resolve(null));
    const idempotencyRedis = asRedis({ set });
    const buildCtx = vi.fn((_actor: Actor): Ctx => {
      throw new Error("buildCtx must not run for an already claimed job");
    });
    const send = vi.fn(() => Promise.resolve({ id: "unused" }));
    const mailer: Mailer = { send };
    const handler = createEmailSendHandler({ buildCtx, mailer, idempotencyRedis });

    await handler(
      {
        to: "customer@example.com",
        subject: "Your receipt",
        organizationId: "01900000-0000-7000-8000-000000000001",
        idempotencyKey: "email-already-claimed",
      },
      { jobId: "job-1", attemptsMade: 1 },
    );

    expect(set).toHaveBeenCalledWith(
      "job:idempotency:email-already-claimed",
      "1",
      "EX",
      60 * 60 * 24 * 7,
      "NX",
    );
    expect(buildCtx).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
