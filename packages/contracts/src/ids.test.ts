import { describe, expect, it } from "vitest";

import { generateUuidV7 } from "@repo/utils";

import {
  asAssetId,
  asInvitationId,
  asInvoiceId,
  asMemberId,
  asOrganizationId,
  asOutboxId,
  asSessionId,
  asUserId,
  organizationIdSchema,
  userIdSchema,
} from "./ids.ts";

describe("branded id schemas", () => {
  it("accepts a UUIDv7", () => {
    const raw = generateUuidV7();
    expect(organizationIdSchema.parse(raw)).toBe(raw);
  });

  it("rejects a UUIDv4", () => {
    // Version nibble is 4 — structurally a UUID, but not time-sortable.
    expect(() => userIdSchema.parse("550e8400-e29b-41d4-a716-446655440000")).toThrow(/UUIDv7/);
  });

  it("validates helper inputs before branding them", () => {
    const raw = generateUuidV7();
    expect([
      asOrganizationId(raw),
      asUserId(raw),
      asMemberId(raw),
      asSessionId(raw),
      asInvitationId(raw),
      asAssetId(raw),
      asOutboxId(raw),
      asInvoiceId(raw),
    ]).toEqual(Array.from({ length: 8 }, () => raw));
    expect(() => asUserId("550e8400-e29b-41d4-a716-446655440000")).toThrow(/UUIDv7/);
  });
});
