import { ForbiddenError } from "@repo/errors";
import type { Actor, OrganizationId, OrganizationRole, UserId } from "@repo/types";
import { describe, expect, it } from "vitest";

import { authorize } from "./authorize.ts";
import { can } from "./can.ts";
import { ALL_ACTIONS, PERMISSIONS, type Action } from "./permissions.ts";
import {
  actionsMissingFrom,
  assertOwnerCoversAllActions,
  permissionsForRole,
  ROLE_PERMISSIONS,
  roleHasPermission,
} from "./roles.ts";

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand constructor
  return id as UserId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand constructor
  return id as OrganizationId;
}

const OTHER_ORG = brandOrganizationId("01900000-0000-7000-8000-000000000099");

function makeActor(
  overrides: Partial<Actor> & {
    role?: OrganizationRole;
  } = {},
): Actor {
  const role = overrides.role ?? "member";
  return {
    userId: overrides.userId ?? brandUserId("01900000-0000-7000-8000-000000000001"),
    organizationId:
      overrides.organizationId ?? brandOrganizationId("01900000-0000-7000-8000-000000000010"),
    role,
    permissions: overrides.permissions ?? permissionsForRole(role),
    isSystem: overrides.isSystem ?? false,
    ...(overrides.isImpersonating === undefined
      ? {}
      : { isImpersonating: overrides.isImpersonating }),
  };
}

describe("assertOwnerCoversAllActions", () => {
  it("passes for the shipped role map", () => {
    expect(() => assertOwnerCoversAllActions()).not.toThrow();
  });

  it("reports actions missing from a grant set", () => {
    expect(actionsMissingFrom([])).toEqual([...ALL_ACTIONS]);
    expect(actionsMissingFrom([...ALL_ACTIONS])).toEqual([]);
  });
});

describe("can / authorize", () => {
  it("denies unknown actions", () => {
    const actor = makeActor({ role: "owner" });
    const decision = can(actor, "unknown:thing" as Action);
    expect(decision).toEqual({
      allowed: false,
      reason: "Unknown action: unknown:thing",
      code: "FORBIDDEN",
    });
  });

  it("allows system actors across tenants", () => {
    const actor = makeActor({
      role: "owner",
      isSystem: true,
    });
    expect(can(actor, PERMISSIONS["organization:delete"]).allowed).toBe(true);
    expect(can(actor, PERMISSIONS["invoice:read"], { organizationId: OTHER_ORG }).allowed).toBe(
      true,
    );
  });

  it("bars destructive actions while impersonating", () => {
    const actor = makeActor({ role: "owner", isImpersonating: true });
    const decision = can(actor, PERMISSIONS["organization:delete"]);
    expect(decision.allowed).toBe(false);
    expect(can(actor, PERMISSIONS["invoice:read"]).allowed).toBe(true);
  });

  it("denies missing permissions", () => {
    const actor = makeActor({ role: "member" });
    expect(can(actor, PERMISSIONS["organization:delete"]).allowed).toBe(false);
  });

  it("denies cross-tenant resources for normal actors", () => {
    const actor = makeActor({ role: "admin" });
    expect(can(actor, PERMISSIONS["invoice:read"], { organizationId: OTHER_ORG }).allowed).toBe(
      false,
    );
  });

  it("allows when permission and tenant match", () => {
    const actor = makeActor({ role: "admin" });
    expect(
      can(actor, PERMISSIONS["invoice:read"], {
        organizationId: actor.organizationId,
      }).allowed,
    ).toBe(true);
  });

  it("authorize throws ForbiddenError on denial", () => {
    const actor = makeActor({ role: "member" });
    expect(() => authorize(actor, PERMISSIONS["organization:delete"])).toThrow(ForbiddenError);
  });

  it("authorize is a no-op when allowed", () => {
    const actor = makeActor({ role: "owner" });
    expect(() => authorize(actor, PERMISSIONS["invoice:read"])).not.toThrow();
  });

  it("assertOwnerCoversAllActions throws when owner grants are incomplete", () => {
    expect(() => assertOwnerCoversAllActions([])).toThrow(/Owner role is missing/);
  });
});

describe("role × action matrix", () => {
  const roles = ["owner", "admin", "member"] as const;

  it("covers every registered action for every role", () => {
    for (const action of ALL_ACTIONS) {
      for (const role of roles) {
        const actor = makeActor({ role });
        const expected = roleHasPermission(role, action);
        expect(can(actor, action).allowed, `${role} ${action}`).toBe(expected);
      }
    }
  });

  it("owner is a superset of admin, admin of member", () => {
    for (const action of ROLE_PERMISSIONS.member) {
      expect(ROLE_PERMISSIONS.admin.includes(action)).toBe(true);
      expect(ROLE_PERMISSIONS.owner.includes(action)).toBe(true);
    }
    for (const action of ROLE_PERMISSIONS.admin) {
      expect(ROLE_PERMISSIONS.owner.includes(action)).toBe(true);
    }
  });

  it("impersonating owner is denied every destructive action", () => {
    const actor = makeActor({ role: "owner", isImpersonating: true });
    for (const action of ALL_ACTIONS) {
      const allowed = can(actor, action).allowed;
      if (
        action === PERMISSIONS["organization:delete"] ||
        action === PERMISSIONS["apiKey:revoke"] ||
        action === PERMISSIONS["apiKey:create"] ||
        action === PERMISSIONS["member:delete"]
      ) {
        expect(allowed, action).toBe(false);
      } else {
        expect(allowed, action).toBe(true);
      }
    }
  });
});
