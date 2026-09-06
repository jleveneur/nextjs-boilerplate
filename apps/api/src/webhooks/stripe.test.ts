import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Cache } from "@repo/cache";
import { createMemoryCache } from "@repo/cache/testing";
import { UnauthorizedError, ValidationError } from "@repo/errors";

import type { ApiEnv } from "../api-env.ts";
import type { AppContainer } from "../server/container.ts";

// The route reads a single key off the validated env; loading the real module
// would require the whole server env to be present for a middleware test.
vi.mock("../env.ts", () => ({ env: { STRIPE_WEBHOOK_SECRET: "whsec_test" } }));

const enqueueStripeWebhookEvent = vi.fn<(ctx: unknown, event: unknown) => Promise<void>>();

vi.mock("@repo/core", () => ({
  enqueueStripeWebhookEvent: (ctx: unknown, event: unknown) =>
    enqueueStripeWebhookEvent(ctx, event),
  systemActorForOrganization: (organizationId: string) => ({ organizationId }),
}));

const { registerStripeWebhook } = await import("./stripe.ts");

const EVENT = {
  id: "evt_1",
  type: "customer.subscription.updated",
  payloadJson: '{"id":"evt_1"}',
};

function createTestApp(cache: Cache, signatureValid = true): OpenAPIHono<ApiEnv> {
  const app = new OpenAPIHono<ApiEnv>();
  const container = {
    cache,
    db: {},
    logger: {},
    ports: {
      payments: {
        constructWebhookEvent: () => (signatureValid ? EVENT : undefined),
      },
    },
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- route reads cache, ports, db, logger
  } as unknown as AppContainer;

  app.use("*", async (c, next) => {
    c.set("container", container);
    await next();
  });
  app.onError((error, c) => {
    if (error instanceof UnauthorizedError) {
      return c.json({ message: error.message }, 401);
    }
    if (error instanceof ValidationError) {
      return c.json({ message: error.message }, 400);
    }
    return c.json({ message: "Unexpected error" }, 500);
  });
  registerStripeWebhook(app);

  return app;
}

const REQUEST_INIT = {
  method: "POST",
  headers: { "stripe-signature": "t=1,v1=sig" },
  body: '{"id":"evt_1"}',
} satisfies RequestInit;

describe("registerStripeWebhook", () => {
  beforeEach(() => {
    enqueueStripeWebhookEvent.mockReset();
    enqueueStripeWebhookEvent.mockResolvedValue();
  });

  it("enqueues a verified event once and replays the acknowledgement", async () => {
    const cache = createMemoryCache("test");
    const app = createTestApp(cache);

    const first = await app.request("/webhooks/stripe", REQUEST_INIT);
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ received: true });
    expect(enqueueStripeWebhookEvent).toHaveBeenCalledOnce();

    // Stripe re-delivers on its own schedule; a settled event must not re-enqueue.
    const duplicate = await app.request("/webhooks/stripe", REQUEST_INIT);
    expect(duplicate.status).toBe(200);
    await expect(duplicate.json()).resolves.toEqual({ received: true, replay: true });
    expect(enqueueStripeWebhookEvent).toHaveBeenCalledOnce();
    await cache.close();
  });

  /**
   * The replay claim is taken before the enqueue. Holding it through a failed
   * enqueue would answer Stripe's retry `replay: true` — acknowledging an event
   * that was never queued, which loses it silently.
   */
  it("releases the replay claim when the enqueue fails", async () => {
    const cache = createMemoryCache("test");
    const app = createTestApp(cache);
    enqueueStripeWebhookEvent.mockRejectedValueOnce(new Error("queue unreachable"));

    const failed = await app.request("/webhooks/stripe", REQUEST_INIT);
    expect(failed.status).toBe(500);

    const retry = await app.request("/webhooks/stripe", REQUEST_INIT);
    expect(retry.status).toBe(200);
    await expect(retry.json()).resolves.toEqual({ received: true });
    expect(enqueueStripeWebhookEvent).toHaveBeenCalledTimes(2);
    await cache.close();
  });

  it("rejects an unverifiable signature without enqueuing", async () => {
    const cache = createMemoryCache("test");
    const app = createTestApp(cache, false);

    const response = await app.request("/webhooks/stripe", REQUEST_INIT);
    expect(response.status).toBe(401);
    expect(enqueueStripeWebhookEvent).not.toHaveBeenCalled();
    await cache.close();
  });
});
