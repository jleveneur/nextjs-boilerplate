import { Writable } from "node:stream";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as CoreModule from "@repo/core";
import { applyStripeSubscriptionEvent, type Ctx } from "@repo/core";
import { createLogger } from "@repo/logger";
import type { Actor } from "@repo/types";

import { createStripeEventProcessHandler } from "./stripe-event-process.ts";

vi.mock("@repo/core", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreModule>();
  return {
    ...actual,
    applyStripeSubscriptionEvent: vi.fn(),
  };
});

function makeCtx(actor: Actor): Ctx {
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- unused by mocked service
    db: {} as Ctx["db"],
    logger: createLogger({
      service: "stripe-event-process-test",
      env: "test",
      level: "error",
      destination: new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    }),
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- unused by handler
    ports: {} as Ctx["ports"],
  };
}

const payload = {
  eventId: "evt_1",
  eventType: "customer.subscription.updated",
  payloadJson: '{"id":"evt_1"}',
};

describe("createStripeEventProcessHandler", () => {
  beforeEach(() => {
    vi.mocked(applyStripeSubscriptionEvent).mockReset();
    vi.mocked(applyStripeSubscriptionEvent).mockResolvedValue(undefined);
  });

  it("applies the stored payload under a system actor", async () => {
    const buildCtx = vi.fn(makeCtx);

    await createStripeEventProcessHandler({ buildCtx })(payload, {
      jobId: "1",
      attemptsMade: 0,
    });

    expect(applyStripeSubscriptionEvent).toHaveBeenCalledWith(
      expect.anything(),
      payload.payloadJson,
    );
    // Webhook processing has no end user; it must not run as an ambient actor.
    expect(buildCtx).toHaveBeenCalledOnce();
    expect(buildCtx.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "01900000-0000-7000-8000-000000000010",
    });
  });

  it("propagates a failure so BullMQ retries the job", async () => {
    vi.mocked(applyStripeSubscriptionEvent).mockRejectedValue(new Error("db unavailable"));

    await expect(
      createStripeEventProcessHandler({ buildCtx: makeCtx })(payload, {
        jobId: "2",
        attemptsMade: 0,
      }),
    ).rejects.toThrow("db unavailable");
  });
});
