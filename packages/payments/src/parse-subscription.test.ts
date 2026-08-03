import { describe, expect, it } from "vitest";

import type Stripe from "stripe";

import { parseStripeSubscription } from "./parse-subscription.ts";

function makeSubscription(): Stripe.Subscription {
  const item = {
    id: "si_1",
    object: "subscription_item" as const,
    current_period_start: 1_700_000_000,
    current_period_end: 1_702_592_000,
    price: {
      id: "price_1",
      object: "price" as const,
      product: "prod_1",
      metadata: { entitlements: "exports:enabled" },
    },
  };

  // Minimal Subscription-shaped fixture for unit parsing.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test fixture
  return {
    id: "sub_1",
    object: "subscription",
    status: "active",
    cancel_at_period_end: false,
    customer: "cus_1",
    metadata: { organizationId: "01900000-0000-7000-8000-000000000001" },
    items: { object: "list", data: [item], has_more: false, url: "" },
  } as unknown as Stripe.Subscription;
}

describe("parseStripeSubscription", () => {
  it("reads period bounds from the first subscription item", () => {
    const parsed = parseStripeSubscription(makeSubscription(), "subscription_upsert");
    expect(parsed.stripePriceId).toBe("price_1");
    expect(parsed.entitlementKeys).toEqual(["exports:enabled"]);
    expect(parsed.currentPeriodStart?.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    expect(parsed.organizationId).toBe("01900000-0000-7000-8000-000000000001");
  });
});
