import { beforeEach, describe, expect, it, vi } from "vitest";

import { insertAuditLog } from "@repo/db";
import type * as DbModule from "@repo/db";
import type { OrganizationId, UserId } from "@repo/types";

import { recordAuditLog } from "./record-audit-log.ts";

vi.mock("@repo/db", async (importOriginal) => {
  const actual = await importOriginal<typeof DbModule>();
  return {
    ...actual,
    insertAuditLog: vi.fn(),
  };
});

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as UserId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as OrganizationId;
}

const organizationId = "01900000-0000-7000-8000-000000000001";
const actorUserId = "01900000-0000-7000-8000-0000000000aa";

describe("recordAuditLog", () => {
  beforeEach(() => {
    vi.mocked(insertAuditLog).mockReset();
  });

  it("parses branded ids and writes the row", async () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- mocked executor
    const db = {} as Parameters<typeof recordAuditLog>[0];

    await recordAuditLog(db, {
      action: "organization.created",
      resourceType: "organization",
      resourceId: organizationId,
      organizationId,
      actorUserId,
      metadata: { slug: "acme" },
    });

    expect(insertAuditLog).toHaveBeenCalledWith(db, {
      organizationId: brandOrganizationId(organizationId),
      actorUserId: brandUserId(actorUserId),
      action: "organization.created",
      resourceType: "organization",
      resourceId: organizationId,
      metadata: { slug: "acme" },
    });
  });

  it("allows a null actor", async () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- mocked executor
    const db = {} as Parameters<typeof recordAuditLog>[0];

    await recordAuditLog(db, {
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: "01900000-0000-7000-8000-000000000010",
      organizationId,
      actorUserId: null,
      metadata: {},
    });

    expect(insertAuditLog).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        actorUserId: null,
        organizationId: brandOrganizationId(organizationId),
      }),
    );
  });
});
