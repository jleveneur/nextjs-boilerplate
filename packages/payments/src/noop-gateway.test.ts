import { describe, expect, it } from "vitest";

import { createNoopPaymentGateway } from "./noop-gateway.ts";
import { createPaymentGateway } from "./stripe-gateway.ts";

describe("createNoopPaymentGateway", () => {
  const gateway = createNoopPaymentGateway();

  it("returns empty catalog and throws on mutating calls", async () => {
    await expect(gateway.listCatalogPrices()).resolves.toEqual([]);
    await expect(
      gateway.createCustomer({
        organizationId: "org",
        email: undefined,
        name: undefined,
      }),
    ).rejects.toThrow(/not configured/i);
    await expect(
      gateway.createCheckoutSession({
        organizationId: "org",
        priceId: "price_1",
        successUrl: "https://example.com/ok",
        cancelUrl: "https://example.com/cancel",
        customerId: undefined,
        customerEmail: undefined,
      }),
    ).rejects.toThrow(/not configured/i);
    await expect(
      gateway.createBillingPortalSession({
        customerId: "cus_1",
        returnUrl: "https://example.com",
      }),
    ).rejects.toThrow(/not configured/i);
  });

  it("rejects webhook construction and parse", () => {
    expect(
      gateway.constructWebhookEvent({
        payload: "{}",
        signatureHeader: "t=1,v1=x",
        webhookSecret: "whsec_x",
      }),
    ).toBeUndefined();
    expect(gateway.parseSubscriptionEvent("{}")).toBeUndefined();
  });
});

describe("createPaymentGateway", () => {
  it("defaults to the no-op gateway without a Stripe secret", async () => {
    const gateway = createPaymentGateway({ secretKey: "" });
    await expect(gateway.listCatalogPrices()).resolves.toEqual([]);
  });
});
