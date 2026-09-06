import { describe, expect, it } from "vitest";

import { ALL_ACTIONS, PERMISSIONS } from "./registry.ts";
import {
  actionsMissingFrom,
  assertOwnerCoversAllActions,
  isOrganizationRole,
  permissionsForRole,
  ROLE_PERMISSIONS,
  roleHasPermission,
} from "./roles.ts";

describe("assertOwnerCoversAllActions", () => {
  it("passes for the shipped role map", () => {
    expect(() => assertOwnerCoversAllActions()).not.toThrow();
  });

  it("throws when owner grants are incomplete", () => {
    // A permission nobody can hold reads like a feature and denies everyone.
    expect(() => assertOwnerCoversAllActions([])).toThrow(/Owner role is missing/);
  });

  it("reports actions missing from a grant set", () => {
    expect(actionsMissingFrom([])).toEqual([...ALL_ACTIONS]);
    expect(actionsMissingFrom([...ALL_ACTIONS])).toEqual([]);
  });
});

describe("role grants", () => {
  it("makes owner a superset of admin, and admin of member", () => {
    for (const action of ROLE_PERMISSIONS.member) {
      expect(ROLE_PERMISSIONS.admin, action).toContain(action);
      expect(ROLE_PERMISSIONS.owner, action).toContain(action);
    }
    for (const action of ROLE_PERMISSIONS.admin) {
      expect(ROLE_PERMISSIONS.owner, action).toContain(action);
    }
  });

  it("grants no action twice", () => {
    for (const role of ["owner", "admin", "member"] as const) {
      const grants = ROLE_PERMISSIONS[role];
      expect(new Set(grants).size, role).toBe(grants.length);
    }
  });

  it("grants only registered actions", () => {
    for (const role of ["owner", "admin", "member"] as const) {
      for (const action of ROLE_PERMISSIONS[role]) {
        expect(ALL_ACTIONS, `${role} ${action}`).toContain(action);
      }
    }
  });

  it("withholds destructive organization actions from member", () => {
    expect(roleHasPermission("member", PERMISSIONS["organization:delete"])).toBe(false);
    expect(roleHasPermission("member", PERMISSIONS["invoice:void"])).toBe(false);
    expect(roleHasPermission("owner", PERMISSIONS["organization:delete"])).toBe(true);
  });

  it("resolves grants by role", () => {
    expect(permissionsForRole("owner")).toBe(ROLE_PERMISSIONS.owner);
    expect(permissionsForRole("member")).toBe(ROLE_PERMISSIONS.member);
  });
});

describe("isOrganizationRole", () => {
  it.each(["owner", "admin", "member"])("accepts %s", (role) => {
    expect(isOrganizationRole(role)).toBe(true);
  });

  it.each(["", "OWNER", "superuser", "guest"])("rejects %s", (role) => {
    expect(isOrganizationRole(role)).toBe(false);
  });
});
