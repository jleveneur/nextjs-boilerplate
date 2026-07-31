import { UnauthorizedError, ValidationError } from "@repo/errors";
import type { OpenAPIHono } from "@hono/zod-openapi";

import type { ApiEnv } from "../app.ts";
import { env } from "../env.ts";
import { extractStripeEventId, verifyStripeSignature } from "./stripe-signature.ts";

const REPLAY_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Stripe webhook skeleton — verify → replay-check → log/enqueue stub → 200.
 *
 * Mounted outside Bearer auth. Event processing is Phase 17 (`@repo/payments`).
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
    const ok = verifyStripeSignature({
      payload,
      header: c.req.header("stripe-signature"),
      secret,
    });
    if (!ok) {
      throw new UnauthorizedError({ message: "Invalid Stripe signature" });
    }

    const eventId = extractStripeEventId(payload);
    if (eventId === undefined) {
      throw new ValidationError({ message: "Stripe event id missing" });
    }

    const container = c.get("container");
    const cacheKey = {
      namespace: "stripe-webhook-replay",
      version: 1,
      key: eventId,
    };

    const seen = await container.cache.get<true>(cacheKey);
    if (seen === true) {
      return c.json({ received: true, replay: true }, 200);
    }

    // Phase 17: enqueue durable processing. Skeleton acknowledges and stores
    // the event id so provider retries are idempotent at the edge.
    container.logger.info({ eventId }, "stripe webhook accepted (processing deferred)");
    await container.cache.set({ ...cacheKey, ttlSeconds: REPLAY_TTL_SECONDS }, true);

    return c.json({ received: true }, 200);
  });
}
