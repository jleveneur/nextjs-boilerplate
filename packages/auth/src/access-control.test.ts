import { describe, expect, it } from "vitest";

import { ac, admin, member, organizationRoles, owner } from "./access-control.ts";

describe("organization access control", () => {
  it("exposes owner, admin, and member roles", () => {
    expect(organizationRoles.owner).toBe(owner);
    expect(organizationRoles.admin).toBe(admin);
    expect(organizationRoles.member).toBe(member);
  });

  it("includes invoice and apiKey statements on the controller", () => {
    expect(ac.statements).toMatchObject({
      invoice: expect.arrayContaining(["create", "void"]),
      apiKey: expect.arrayContaining(["create", "revoke", "list"]),
    });
  });
});
