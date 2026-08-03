import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createStripePaymentGateway } from "./stripe-gateway.ts";

function sign(payload: string, secret: string, timestamp: number): string {
  const v1 = createHmac("sha256", secret)
    .update(`${String(timestamp)}.${payload}`)
    .digest("hex");
  return `t=${String(timestamp)},v1=${v1}`;
}

describe("createStripePaymentGateway.constructWebhookEvent", () => {
  const secret = "whsec_test_secret";
  const gateway = createStripePaymentGateway({
    // Unused for constructEvent; any sk_ shape works for client init.
    secretKey: "sk_test_construct_only",
  });

  it("accepts a valid signature", () => {
    const payload = JSON.stringify({
      id: "evt_test_1",
      object: "event",
      type: "customer.subscription.updated",
      data: { object: {} },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const event = gateway.constructWebhookEvent({
      payload,
      signatureHeader: sign(payload, secret, timestamp),
      webhookSecret: secret,
    });
    expect(event?.id).toBe("evt_test_1");
    expect(event?.type).toBe("customer.subscription.updated");
  });

  it("rejects a bad signature", () => {
    const payload = JSON.stringify({ id: "evt_test_2", object: "event", type: "ping", data: {} });
    const event = gateway.constructWebhookEvent({
      payload,
      signatureHeader: `t=${String(Math.floor(Date.now() / 1000))},v1=deadbeef`,
      webhookSecret: secret,
    });
    expect(event).toBeUndefined();
  });
});
