import { describe, expect, it } from "vitest";

import { JOB_NAMES, isJobName, parseJobPayload } from "./registry.ts";

describe("job registry", () => {
  it("recognises registered names", () => {
    expect(isJobName(JOB_NAMES.emailSend)).toBe(true);
    expect(isJobName(JOB_NAMES.invoiceVoidedNotify)).toBe(true);
    expect(isJobName("unknown.job")).toBe(false);
  });

  it("parses a valid email.send payload", () => {
    const payload = parseJobPayload("email.send", {
      to: "user@example.com",
      subject: "Welcome",
      organizationId: "01900000-0000-7000-8000-000000000001",
      idempotencyKey: "outbox-1",
    });

    expect(payload.to).toBe("user@example.com");
  });

  it("rejects an invalid payload", () => {
    expect(() =>
      parseJobPayload("email.send", {
        to: "not-an-email",
        subject: "Welcome",
        organizationId: "01900000-0000-7000-8000-000000000001",
        idempotencyKey: "outbox-1",
      }),
    ).toThrow();
  });

  it("parses a valid invoice.voided.notify payload", () => {
    const payload = parseJobPayload("invoice.voided.notify", {
      invoiceId: "01900000-0000-7000-8000-000000000002",
      organizationId: "01900000-0000-7000-8000-000000000001",
      amountMinor: 1_00,
      idempotencyKey: "outbox-2",
    });

    expect(payload.amountMinor).toBe(100);
  });
});
