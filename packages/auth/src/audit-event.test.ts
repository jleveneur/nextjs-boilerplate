import { describe, expect, it, vi } from "vitest";

import { emitAuthAudit } from "./audit-event.ts";

const organizationId = "01900000-0000-7000-8000-000000000001";
const userId = "01900000-0000-7000-8000-0000000000aa";

describe("emitAuthAudit", () => {
  it("no-ops when no listener is configured", async () => {
    await expect(
      emitAuthAudit(undefined, {
        action: "user.created",
        resourceType: "user",
        resourceId: userId,
        organizationId,
        actorUserId: userId,
        metadata: {},
      }),
    ).resolves.toBeUndefined();
  });

  it("forwards the event to the listener", async () => {
    const onAuditEvent = vi.fn().mockResolvedValue(undefined);
    const event = {
      action: "organization.created",
      resourceType: "organization",
      resourceId: organizationId,
      organizationId,
      actorUserId: userId,
      metadata: { slug: "acme" },
    };

    await emitAuthAudit(onAuditEvent, event);

    expect(onAuditEvent).toHaveBeenCalledWith(event);
  });
});
