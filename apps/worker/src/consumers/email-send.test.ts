import type { Redis } from "ioredis";
import { describe, expect, it, vi } from "vitest";

import type { Ctx } from "@repo/core";
import type { Mailer } from "@repo/email";
import type { Actor } from "@repo/types";

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

  it("escapes the subject before interpolating it into the HTML body", async () => {
    // The body is assembled with a template literal, so the subject reaches the
    // recipient's mail client as markup unless it is escaped on the way in. A job
    // payload is a validated string, not trusted markup: whoever enqueues the job
    // decides the subject, and `<a href>` in a message sent from our domain is a
    // phishing primitive rather than a rendering glitch.
    const set = vi.fn(() => Promise.resolve("OK"));
    const get = vi.fn(() => Promise.resolve(null));
    const del = vi.fn(() => Promise.resolve(1));
    const idempotencyRedis = asRedis({ set, get, del, eval: vi.fn(() => Promise.resolve(1)) });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- handler only reads ctx.logger
    const buildCtx = vi.fn(
      (_actor: Actor): Ctx => ({ logger: { info: vi.fn() } }) as unknown as Ctx,
    );
    // Typed on the port so `mock.calls` carries the argument type: an untyped
    // `vi.fn` records calls as `[]` and the assertions below cannot reach them.
    const send = vi.fn<Mailer["send"]>(() => Promise.resolve({ id: "sent" }));
    const mailer: Mailer = { send };
    const handler = createEmailSendHandler({ buildCtx, mailer, idempotencyRedis });

    await handler(
      {
        to: "customer@example.com",
        subject: '<a href="https://phish.example">Your receipt</a>',
        organizationId: "01900000-0000-7000-8000-000000000001",
        idempotencyKey: "email-escaping",
      },
      { jobId: "job-3", attemptsMade: 1 },
    );

    const sent = send.mock.calls[0]?.[0];
    // The subject header itself is not markup and is passed through untouched.
    expect(sent?.subject).toBe('<a href="https://phish.example">Your receipt</a>');
    expect(sent?.html).toBe(
      "<p>&lt;a href=&quot;https://phish.example&quot;&gt;Your receipt&lt;/a&gt;</p>",
    );
  });
});
