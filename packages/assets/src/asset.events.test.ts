import { describe, expect, it } from "vitest";

import { ASSET_CONFIRMED, assetConfirmedEvent } from "./asset.events.ts";

describe("assetConfirmedEvent", () => {
  it("stamps the event type and carries the payload through unchanged", () => {
    const occurredAt = new Date("2026-01-01T00:00:00.000Z");
    const payload = {
      assetId: "01900000-0000-7000-8000-000000000001",
      organizationId: "01900000-0000-7000-8000-000000000002",
      outboxId: "01900000-0000-7000-8000-000000000003",
    };

    const event = assetConfirmedEvent(payload, occurredAt);

    // The relay keys handlers off `type`, and uses `outboxId` as the
    // side-effect claim — both have to survive the round trip verbatim.
    expect(event).toEqual({ type: ASSET_CONFIRMED, payload, occurredAt });
    expect(ASSET_CONFIRMED).toBe("asset.confirmed");
  });
});
