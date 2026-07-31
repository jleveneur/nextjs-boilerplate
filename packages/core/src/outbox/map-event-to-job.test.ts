import { describe, expect, it } from "vitest";

import { ASSET_CONFIRMED } from "../assets/asset.events.ts";
import { INVOICE_VOIDED } from "../billing/billing.events.ts";
import { mapOutboxEventToJob } from "./map-event-to-job.ts";

describe("mapOutboxEventToJob", () => {
  it("maps invoice.voided to invoice.voided.notify", () => {
    const mapped = mapOutboxEventToJob(INVOICE_VOIDED, {
      invoiceId: "01900000-0000-7000-8000-000000000002",
      organizationId: "01900000-0000-7000-8000-000000000001",
      amountMinor: 250,
      outboxId: "01900000-0000-7000-8000-000000000099",
    });

    expect(mapped).toEqual({
      name: "invoice.voided.notify",
      jobId: "01900000-0000-7000-8000-000000000099",
      payload: {
        invoiceId: "01900000-0000-7000-8000-000000000002",
        organizationId: "01900000-0000-7000-8000-000000000001",
        amountMinor: 250,
        idempotencyKey: "01900000-0000-7000-8000-000000000099",
      },
    });
  });

  it("maps asset.confirmed to image.derive", () => {
    const mapped = mapOutboxEventToJob(ASSET_CONFIRMED, {
      assetId: "01900000-0000-7000-8000-000000000003",
      organizationId: "01900000-0000-7000-8000-000000000001",
      outboxId: "01900000-0000-7000-8000-000000000098",
    });

    expect(mapped?.name).toBe("image.derive");
    expect(mapped?.jobId).toBe("01900000-0000-7000-8000-000000000098");
  });

  it("returns null for unknown event types", () => {
    expect(mapOutboxEventToJob("analytics.ping", {})).toBeNull();
  });
});
