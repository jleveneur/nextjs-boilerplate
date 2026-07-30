import { describe, expect, it } from "vitest";

import { permissionsForRole } from "@repo/authz";
import type { Actor, OrganizationId, UserId } from "@repo/types";

import { canVoidInvoice } from "./billing.policy.ts";

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as UserId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as OrganizationId;
}

function actor(
  role: "owner" | "admin" | "member",
  org = "01900000-0000-7000-8000-000000000001",
): Actor {
  return {
    userId: brandUserId("01900000-0000-7000-8000-0000000000aa"),
    organizationId: brandOrganizationId(org),
    role,
    permissions: permissionsForRole(role),
    isSystem: false,
  };
}

describe("canVoidInvoice", () => {
  const org = brandOrganizationId("01900000-0000-7000-8000-000000000001");

  it("allows an owner to void an open invoice", () => {
    expect(
      canVoidInvoice(actor("owner"), { id: "inv", organizationId: org, status: "open" }).allowed,
    ).toBe(true);
  });

  it("denies a member (no invoice:void)", () => {
    expect(
      canVoidInvoice(actor("member"), { id: "inv", organizationId: org, status: "open" }).allowed,
    ).toBe(false);
  });

  it("denies when the invoice is paid", () => {
    const decision = canVoidInvoice(actor("owner"), {
      id: "inv",
      organizationId: org,
      status: "paid",
    });
    expect(decision.allowed).toBe(false);
  });

  it("denies cross-tenant resources", () => {
    const other = brandOrganizationId("01900000-0000-7000-8000-000000000099");
    expect(
      canVoidInvoice(actor("owner"), { id: "inv", organizationId: other, status: "open" }).allowed,
    ).toBe(false);
  });
});
