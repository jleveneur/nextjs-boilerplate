import type Stripe from "stripe";

import { entitlementKeysFromMetadata } from "./entitlements.ts";
import type { ParsedSubscriptionEvent } from "./types.ts";

function unixToDate(seconds: number | undefined | null): Date | undefined {
  if (seconds === null || seconds === undefined) {
    return undefined;
  }
  return new Date(seconds * 1000);
}

function firstItem(subscription: Stripe.Subscription): Stripe.SubscriptionItem | undefined {
  return subscription.items.data[0];
}

/**
 * Normalize a Stripe subscription object into domain fields.
 */
export function parseStripeSubscription(
  subscription: Stripe.Subscription,
  kind: ParsedSubscriptionEvent["kind"],
): ParsedSubscriptionEvent {
  const item = firstItem(subscription);
  const price = item?.price;
  const productId = typeof price?.product === "string" ? price.product : (price?.product?.id ?? "");
  const metadata = {
    ...(typeof price?.product === "object" &&
    price.product !== null &&
    !("deleted" in price.product)
      ? price.product.metadata
      : undefined),
    ...price?.metadata,
    ...subscription.metadata,
  };

  return {
    kind,
    organizationId:
      subscription.metadata["organizationId"] ?? subscription.metadata["organization_id"],
    stripeCustomerId:
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    stripePriceId: price?.id ?? "",
    stripeProductId: productId,
    status: subscription.status,
    // Stripe API 2025+ moved period bounds onto subscription items.
    currentPeriodStart: unixToDate(item?.current_period_start),
    currentPeriodEnd: unixToDate(item?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    entitlementKeys: entitlementKeysFromMetadata(metadata),
  };
}
