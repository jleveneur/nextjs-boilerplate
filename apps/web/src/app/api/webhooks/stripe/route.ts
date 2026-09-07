import { NextResponse } from "next/server";

import { systemActorForOrganization } from "@repo/kernel";
import { applyStripeSubscriptionEvent } from "@repo/subscription";
import type { OrganizationId } from "@repo/types";

import { env } from "@/env/server.ts";
import { getContainer } from "@/server/container.ts";

const REPLAY_TTL_SECONDS = 60 * 60 * 24 * 7;
const PENDING_TTL_SECONDS = 60 * 5;

// Placeholder tenant for the edge: the real organization is resolved from the
// event payload inside `applyStripeSubscriptionEvent`.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- well-known sentinel
const EDGE_ORG_ID = "01900000-0000-7000-8000-000000000010" as OrganizationId;

/**
 * Stripe webhook — verify → claim → apply → 200.
 *
 * Applied inline. With no queue, the HTTP response is the only signal Stripe
 * has, so a failure must surface as a non-2xx and let Stripe retry rather than
 * being swallowed after an early 200.
 *
 * The replay claim is what makes a Stripe retry a no-op. Holding it after a
 * failed apply would answer the retry `replay: true` and drop the event, so it
 * is released on any failure.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (secret === undefined || secret === "") {
    // Not configured is a deployment error, not a caller error.
    return NextResponse.json({ error: "Stripe webhook secret is not configured" }, { status: 500 });
  }

  const container = getContainer();
  const payload = await request.text();
  const event = container.ports.payments.constructWebhookEvent({
    payload,
    signatureHeader: request.headers.get("stripe-signature") ?? undefined,
    webhookSecret: secret,
  });
  if (event === undefined) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 401 });
  }

  const cacheKey = { namespace: "stripe-webhook-replay", version: 1, key: event.id };

  const claimed = await container.cache.setIfAbsent(
    { ...cacheKey, ttlSeconds: PENDING_TTL_SECONDS },
    true,
  );
  if (!claimed) {
    return NextResponse.json({ received: true, replay: true });
  }

  try {
    await applyStripeSubscriptionEvent(
      {
        actor: systemActorForOrganization(EDGE_ORG_ID),
        db: container.db,
        logger: container.logger,
        ports: container.ports,
      },
      event.payloadJson,
    );
  } catch (error) {
    await container.cache.del(cacheKey);
    throw error;
  }

  await container.cache.set({ ...cacheKey, ttlSeconds: REPLAY_TTL_SECONDS }, true);

  return NextResponse.json({ received: true });
}
