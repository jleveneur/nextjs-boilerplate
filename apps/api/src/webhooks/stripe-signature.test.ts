import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { extractStripeEventId, verifyStripeSignature } from "./stripe-signature.ts";

function sign(payload: string, secret: string, timestamp: number): string {
  const v1 = createHmac("sha256", secret)
    .update(`${String(timestamp)}.${payload}`)
    .digest("hex");
  return `t=${String(timestamp)},v1=${v1}`;
}

describe("verifyStripeSignature", () => {
  it("accepts a valid signature", () => {
    const payload = JSON.stringify({ id: "evt_1" });
    const secret = "whsec_test";
    const timestamp = Math.floor(Date.now() / 1000);
    expect(
      verifyStripeSignature({
        payload,
        header: sign(payload, secret, timestamp),
        secret,
      }),
    ).toBe(true);
  });

  it("rejects a bad signature", () => {
    const payload = JSON.stringify({ id: "evt_1" });
    expect(
      verifyStripeSignature({
        payload,
        header: `t=${String(Math.floor(Date.now() / 1000))},v1=deadbeef`,
        secret: "whsec_test",
      }),
    ).toBe(false);
  });
});

describe("extractStripeEventId", () => {
  it("reads id from JSON", () => {
    expect(extractStripeEventId(JSON.stringify({ id: "evt_abc" }))).toBe("evt_abc");
  });
});
