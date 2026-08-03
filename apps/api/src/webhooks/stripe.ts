import { enqueueStripeWebhookEvent, systemActorForOrganization } from "@repo/core";
import { UnauthorizedError, ValidationError } from "@repo/errors";
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { OrganizationId } from "@repo/types";

import type { ApiEnv } from "../app.ts";
import { env } from "../env.ts";

const REPLAY_TTL_SECONDS = 60 * 60 * 24 * 7;

// Placeholder tenant for edge enqueue (job payload carries the real event).
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- well-known sentinel
const EDGE_ORG_ID = "01900000-0000-7000-8000-000000000010" as OrganizationId;

/**
 * Stripe webhook — verify → replay-check → enqueue → 200.
 *
 * Mounted outside Bearer auth. Processing runs on the worker via BullMQ.
 */
export function registerStripeWebhook(app: OpenAPIHono<ApiEnv>): void {
  app.post("/webhooks/stripe", async (c) => {
    const secret = env.STRIPE_WEBHOOK_SECRET;
    if (secret === undefined || secret === "") {
      throw new ValidationError({
        message: "Stripe webhook secret is not configured",
      });
    }

    const payload = await c.req.text();
    const container = c.get("container");
    const event = container.ports.payments.constructWebhookEvent({
      payload,
      signatureHeader: c.req.header("stripe-signature"),
      webhookSecret: secret,
    });
    if (event === undefined) {
      throw new UnauthorizedError({ message: "Invalid Stripe signature" });
    }

    const cacheKey = {
      namespace: "stripe-webhook-replay",
      version: 1,
      key: event.id,
    };

    const seen = await container.cache.get<true>(cacheKey);
    if (seen === true) {
      return c.json({ received: true, replay: true }, 200);
    }

    const ctx = {
      actor: systemActorForOrganization(EDGE_ORG_ID),
      db: container.db,
      logger: container.logger,
      ports: container.ports,
    };

    await enqueueStripeWebhookEvent(ctx, {
      eventId: event.id,
      eventType: event.type,
      payloadJson: event.payloadJson,
    });

    await container.cache.set({ ...cacheKey, ttlSeconds: REPLAY_TTL_SECONDS }, true);

    return c.json({ received: true }, 200);
  });
}
